using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Portfolio.Server;

public static class ChatEndpoint
{
    public const string DefaultModel = "gpt-6-luna";
    public const int MaxOutputTokens = 600;
    private const int MaxHistoryMessages = 20;
    private const int MaxHistoryBytes = 16_000;
    private const string UnavailableMessage = "AI chat is temporarily unavailable. Please try again later.";
    private const string SystemPrompt = """
        You are the AI solutions consultant on Ben Kuhman's portfolio website.
        Help a prospective client identify practical ways Ben could implement AI improvements
        for their business, including workflow automation and integration with web applications.
        Tailor suggestions to the business and its challenges. Start with 2-3 concrete ideas,
        explaining a useful first step and the likely benefit in plain language.
        Keep each reply under 200 words. End with one focused follow-up question or, when the
        visitor is ready to discuss a project, invite them to use the site's Contact page.
        Do not invent Ben's past clients, results, prices, or guarantees. Stay focused on the
        visitor's business and AI implementation rather than unrelated general-purpose tasks.
        """;

    public static async Task<IResult> HandleAsync(ChatRequest request, HttpContext http,
        IHttpClientFactory httpFactory, IConfiguration configuration, ILoggerFactory loggerFactory)
    {
        var history = request.History;
        if (history is null || history.Length == 0 || history.Any(message =>
                message is null || message.Role is not ("user" or "assistant") ||
                string.IsNullOrWhiteSpace(message.Content)) || history[^1].Role != "user")
            return Problem(400, "chat_invalid_request", "Please enter a message and try again.");

        if (history.Length > MaxHistoryMessages ||
            history.Sum(message => (long)Encoding.UTF8.GetByteCount(message.Content)) > MaxHistoryBytes)
            return Problem(400, "chat_history_limit", "This conversation is too long. Please start a new conversation or shorten your message.");

        var logger = loggerFactory.CreateLogger("ChatEndpoint");
        var key = configuration["OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            logger.LogError("AI chat credentials are not configured.");
            return Problem(503, "chat_unavailable", UnavailableMessage);
        }

        var model = configuration["OpenAI:Model"]?.Trim();
        if (string.IsNullOrEmpty(model)) model = DefaultModel;
        var cancellation = http.RequestAborted;
        using var client = httpFactory.CreateClient("OpenAI");
        using var upstreamRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = JsonContent.Create(new
            {
                model,
                stream = true,
                reasoning_effort = "none",
                max_completion_tokens = MaxOutputTokens,
                service_tier = "default",
                messages = new[] { new ChatMessage("system", SystemPrompt) }.Concat(history)
            })
        };
        upstreamRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key.Trim());
        upstreamRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        try
        {
            using var response = await client.SendAsync(upstreamRequest,
                HttpCompletionOption.ResponseHeadersRead, cancellation);
            if (!response.IsSuccessStatusCode)
            {
                var code = await ReadErrorCodeAsync(response, cancellation);
                logger.LogWarning("OpenAI chat failed: HTTP {Status}, code {Code}, model {Model}.",
                    (int)response.StatusCode, code, model);
                return response.StatusCode == HttpStatusCode.TooManyRequests && code == "rate_limit_exceeded"
                    ? Problem(429, "chat_rate_limited", "AI chat is busy. Please wait a moment and try again.")
                    : Problem(503, "chat_unavailable", UnavailableMessage);
            }

            http.Response.ContentType = "text/plain; charset=utf-8";
            http.Response.Headers.CacheControl = "no-store";
            http.Response.Headers["X-Accel-Buffering"] = "no";
            await using var stream = await response.Content.ReadAsStreamAsync(cancellation);
            using var reader = new StreamReader(stream);
            var hasContent = false;
            var finished = false;
            while (await reader.ReadLineAsync(cancellation) is { } line)
            {
                if (!line.StartsWith("data:", StringComparison.Ordinal)) continue;
                var data = line[5..].Trim();
                if (data == "[DONE]") { finished = true; break; }
                if (data.Length == 0) continue;
                using var document = JsonDocument.Parse(data);
                if (!document.RootElement.TryGetProperty("choices", out var choices) ||
                    choices.ValueKind != JsonValueKind.Array ||
                    choices.GetArrayLength() == 0 ||
                    choices[0].ValueKind != JsonValueKind.Object ||
                    !choices[0].TryGetProperty("delta", out var delta) ||
                    delta.ValueKind != JsonValueKind.Object) continue;
                if (!delta.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.String)
                {
                    if (!delta.TryGetProperty("refusal", out content) || content.ValueKind != JsonValueKind.String)
                        continue;
                }
                var text = content.GetString();
                if (string.IsNullOrEmpty(text)) continue;
                hasContent = true;
                await http.Response.WriteAsync(text, cancellation);
                await http.Response.Body.FlushAsync(cancellation);
            }
            if (!hasContent) throw new InvalidDataException("The upstream stream contained no reply.");
            if (!finished) throw new InvalidDataException("The upstream stream ended before completion.");
            return Results.Empty;
        }
        catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
        {
            return Results.Empty;
        }
        catch (Exception error) when (error is HttpRequestException or IOException or InvalidDataException or JsonException or OperationCanceledException)
        {
            // Log the category only: provider response bodies and credentials stay private.
            logger.LogWarning("AI chat stream failed: {ErrorType}.", error.GetType().Name);
            if (http.Response.HasStarted)
            {
                http.Abort();
                return Results.Empty;
            }
            return Problem(503, "chat_unavailable", UnavailableMessage);
        }
    }

    private static IResult Problem(int status, string code, string message) =>
        Results.Problem(statusCode: status, title: "AI chat unavailable", detail: message,
            extensions: new Dictionary<string, object?> { ["code"] = code });

    private static async Task<string> ReadErrorCodeAsync(HttpResponseMessage response, CancellationToken cancellation)
    {
        try
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellation));
            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("code", out var code) && code.ValueKind == JsonValueKind.String)
            {
                var value = code.GetString();
                if (value is { Length: > 0 and <= 64 } &&
                    value.All(character => char.IsAsciiLetterOrDigit(character) || character == '_')) return value;
            }
        }
        catch (JsonException) { }
        return "unknown";
    }
}

public record ChatMessage(string Role, string Content);
public record ChatRequest(ChatMessage[]? History);
