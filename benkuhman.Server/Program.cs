using System.Net.Http.Headers;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddCors();

builder.Services.AddHttpClient("OpenAI", client =>
{
    var openAiKey = builder.Configuration["OpenAI:ApiKey"]
                 ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured!");
    client.BaseAddress = new Uri("https://api.openai.com/v1/");
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", openAiKey);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    
    // Allow CORS for development
    app.UseCors(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
}

app.UseHttpsRedirection();

app.MapPost("/api/chat/stream", async (ChatRequest req, HttpContext http, IHttpClientFactory httpFactory) =>
{
    var chatMessages = req.History
        .Select(m => new ChatMessage(m.Role, m.Content))
        .ToArray();

    var payload = new
    {
        model = "gpt-4.1-nano",
        stream = true,
        messages = chatMessages,
    };
    
    var client = httpFactory.CreateClient("OpenAI");
    var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
    {
        Content = JsonContent.Create(payload)
    };
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

    using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
    response.EnsureSuccessStatusCode();

    http.Response.ContentType = "text/event-stream";
    await using var body   = await response.Content.ReadAsStreamAsync();
    using var reader = new StreamReader(body);
    
    while (!reader.EndOfStream)
    {
        var line = await reader.ReadLineAsync();
        if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data:")) 
            continue;

        var json = line["data:".Length..].Trim();
        if (json == "[DONE]") 
            break;

        using var doc = JsonDocument.Parse(json);
        var deltaElement = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("delta");

        if (deltaElement.TryGetProperty("content", out var content))
        {
            var chunk = content.GetString();
            if (!string.IsNullOrEmpty(chunk))
            {
                // write it out immediately
                await http.Response.WriteAsync(chunk);
                await http.Response.Body.FlushAsync();
            }
        }
    }
})
.WithName("ChatWithAIStream");

app.Run();

public record ChatMessage(string Role, string Content);

public record ChatRequest(ChatMessage[] History);

public record ChatCompletionResponse(Choice[] Choices);
public record Choice(Message Message);
public record Message(string Role, string Content);