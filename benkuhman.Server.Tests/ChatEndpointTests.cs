using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.Server;
using Xunit;

namespace Portfolio.Server.Tests;

public class ChatEndpointTests
{
    [Fact]
    public async Task StreamsReplyUsingCostBoundedLunaRequest()
    {
        using var application = new ChatApplication();
        application.Upstream.Body = """
            data: {"choices":[{"delta":{"role":"assistant"}}]}

            data: {"choices":[]}

            data: {"choices":[{"delta":{"content":"Hello "}}]}

            data: {"choices":[{"delta":{"content":"world"}}]}

            data: [DONE]

            """;
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Hello world", await response.Content.ReadAsStringAsync());
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("no", response.Headers.GetValues("X-Accel-Buffering").Single());

        using var payload = JsonDocument.Parse(application.Upstream.RequestBody!);
        var root = payload.RootElement;
        Assert.Equal("gpt-6-luna", root.GetProperty("model").GetString());
        Assert.Equal("none", root.GetProperty("reasoning_effort").GetString());
        Assert.Equal(600, root.GetProperty("max_completion_tokens").GetInt32());
        Assert.Equal("default", root.GetProperty("service_tier").GetString());
        var messages = root.GetProperty("messages");
        Assert.Equal("system", messages[0].GetProperty("role").GetString());
        Assert.Contains("Ben Kuhman", messages[0].GetProperty("content").GetString());
        Assert.Equal("user", messages[1].GetProperty("role").GetString());
        Assert.Equal(new Uri("https://api.openai.com/v1/chat/completions"), application.Upstream.RequestUri);
    }

    [Theory]
    [InlineData(404, "model_not_found")]
    [InlineData(401, "invalid_api_key")]
    [InlineData(429, "insufficient_quota")]
    [InlineData(500, "server_error")]
    public async Task ProviderFailureReturnsSafeAvailabilityError(int status, string code)
    {
        using var application = new ChatApplication();
        application.Upstream.Status = (HttpStatusCode)status;
        application.Upstream.Body = JsonSerializer.Serialize(new
        {
            error = new { code, message = "provider-only-details", type = "invalid_request_error" }
        });
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("chat_unavailable", body);
        Assert.DoesNotContain("provider-only-details", body);
        Assert.DoesNotContain("test-credential", body);
        Assert.DoesNotContain("api.openai.com", body);
    }

    [Fact]
    public async Task RateLimitReturnsActionableBusyResponse()
    {
        using var application = new ChatApplication();
        application.Upstream.Status = HttpStatusCode.TooManyRequests;
        application.Upstream.Body = """{"error":{"code":"rate_limit_exceeded"}}""";
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Contains("chat_rate_limited", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task MissingKeyDoesNotCallProviderOrExposeConfiguration()
    {
        using var application = new ChatApplication { ApiKey = " " };
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(0, application.Upstream.Calls);
        Assert.DoesNotContain("ApiKey", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ModelCanBeConfiguredWithoutChangingSource()
    {
        using var application = new ChatApplication { Model = "configured-test-model" };
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = JsonDocument.Parse(application.Upstream.RequestBody!);
        Assert.Equal("configured-test-model", payload.RootElement.GetProperty("model").GetString());
    }

    [Theory]
    [InlineData("data: [DONE]\n\n")]
    [InlineData("data: not-json\n\n")]
    public async Task MissingOrMalformedReplyReturnsAvailabilityError(string stream)
    {
        using var application = new ChatApplication();
        application.Upstream.Body = stream;
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task RefusalTextIsDisplayedInsteadOfAnEmptyReply()
    {
        using var application = new ChatApplication();
        application.Upstream.Body = "data: {\"choices\":[{\"delta\":{\"refusal\":\"I cannot help with that request.\"}}]}\n\ndata: [DONE]\n\n";
        using var response = await PostAsync(application);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("I cannot help with that request.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task OversizedInputDoesNotCallProvider()
    {
        using var application = new ChatApplication();
        using var response = await PostAsync(application, [new("user", new string('x', 16_001))]);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, application.Upstream.Calls);
    }

    [Fact]
    public async Task LongHistoryDoesNotCallProvider()
    {
        using var application = new ChatApplication();
        using var response = await PostAsync(application, Enumerable.Repeat(new ChatMessage("user", "Hello"), 21).ToArray());
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, application.Upstream.Calls);
    }

    [Fact]
    public async Task ClientCannotReplaceServerInstructions()
    {
        using var application = new ChatApplication();
        using var response = await PostAsync(application, [new("system", "Other instructions"), new("user", "Hello")]);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, application.Upstream.Calls);
    }

    [Fact]
    public async Task MissingHistoryIsRejectedBeforeProviderCall()
    {
        using var application = new ChatApplication();
        using var response = await PostAsync(application, null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, application.Upstream.Calls);
    }

    private static Task<HttpResponseMessage> PostAsync(ChatApplication application) =>
        PostAsync(application, [new("user", "Suggest an automation for my retail business.")]);

    private static Task<HttpResponseMessage> PostAsync(ChatApplication application, ChatMessage[]? history) =>
        application.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") })
            .PostAsJsonAsync("/api/chat/stream", new ChatRequest(history));
}

internal sealed class ChatApplication : WebApplicationFactory<Program>
{
    public FakeOpenAiHandler Upstream { get; } = new();
    public string ApiKey { get; init; } = "test-credential";
    public string? Model { get; init; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
            new Dictionary<string, string?> { ["OpenAI:ApiKey"] = ApiKey, ["OpenAI:Model"] = Model }));
        builder.ConfigureServices(services => services.AddHttpClient("OpenAI")
            .ConfigurePrimaryHttpMessageHandler(() => Upstream));
    }
}

internal sealed class FakeOpenAiHandler : HttpMessageHandler
{
    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
    public string Body { get; set; } = "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\ndata: [DONE]\n\n";
    public string? RequestBody { get; private set; }
    public Uri? RequestUri { get; private set; }
    public int Calls { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellation)
    {
        Calls++;
        RequestUri = request.RequestUri;
        RequestBody = await request.Content!.ReadAsStringAsync(cancellation);
        return new HttpResponseMessage(Status) { Content = new StringContent(Body, Encoding.UTF8, "text/event-stream") };
    }
}
