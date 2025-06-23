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
    var payload = new
    {
        model = "gpt-4.1-nano",
        stream = true,
        messages = new[]
        {
            new {
                role = "system",
                content = "Suggest AI solutions tailored to a business based on its description and an optional challenge or difficulty the business faces.\\n\\nConsider the type of business, its operations, customer interactions, and any stated challenges. Identify AI solutions that can enhance efficiency, improve customer engagement, or address specific business difficulties.\\n\\n# Steps\\n\\n1. **Understand the Business**: Analyze the provided business description to determine its main activities, industry, and goals.\\n2. **Identify Challenges**: Take note of any optional challenges mentioned to understand specific areas where the business might benefit from an AI solution.\\n3. **Match AI Solutions**: Suggest AI solutions that align with the business operations and address any challenges. Consider various AI domains such as automation, data analysis, customer service, etc.\\n4. **Provide Justification**: Offer reasoning for each suggested AI solution, explaining how it fits the business and addresses the stated challenges.\\n\\n# Output Format\\n\\nThe response should be a structured list of 2-3 AI solutions with a brief explanation for each on how it benefits the business, formatted as follows:\\n- [AI Solution Name]: [Description of how this AI solution can aid the business and address any challenges.]\\n\\nAt the end of the list, include a brief question or invitation to engage further, such as:\\n\\n- \\\"Would you like more suggestions for another aspect of the business?\\\"\\n- \\\"Would you like suggestions based on another challenge of your business?\\\"\\n- \\\"Would you like to know what others in similar businesses are doing to implement AI solutions?\\\"\\n\\n# Examples\\n\\n**Example 1:**\\n- **Business Description**: A retail store focusing on sustainable clothing.\\n- **Challenge**: Difficulty in predicting inventory needs.\\n\\n  **Output**:\\n  - **AI-Driven Inventory Management**: Utilize AI algorithms to analyze sales data and predict inventory needs, minimizing stockouts and overstocks.\\n  - **Chatbot for Customer Service**: Implement a chatbot to assist customers with queries on sustainable practices and availability of products.\\n\\n**Example 2:**\\n- **Business Description**: A digital marketing agency that specializes in social media campaigns.\\n- **Challenge**: Managing client engagements and campaign tracking.\\n\\n  **Output**:\\n  - **AI-Powered Analytics Tools**: Employ AI to provide insights on campaign performance and optimize future strategies based on data trends.\\n  - **Automated Client Reporting**: Use AI to generate real-time, automated reports for clients, improving engagement and transparency.\\n\\n# Notes\\n\\n- Ensure any suggested AI solution aligns with the business size and capability to implement such technologies.\\n- Consider the potential ROI and practicality of the AI solution for the specific business scenario.\\n\\n# Tone\\n\\n- The response should use simple, friendly language that a non-technical business owner can easily understand.\\n- Avoid technical jargon like \\\"NLP\\\" or \\\"OCR\\\" unless briefly explained in plain terms.\\n- Aim for a helpful, conversational tone. Think of this as advice from a friendly consultant, not a technical report."
            },
            new {
                role = "user",
                content = $"Business Description: ${req.Description} \n" +
                          $"Challenge: {req.Challenge ?? "None provided."}".Trim()
            }
        }
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

public record ChatRequest(string Description, string? Challenge);

public record ChatCompletionResponse(Choice[] Choices);
public record Choice(Message Message);
public record Message(string Role, string Content);