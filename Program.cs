using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddOpenApi();

// Configure file upload size limits
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB limit
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Enable static file serving
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();

// Add a simple route for our grid
app.MapGet("/grid", () => Results.Redirect("/index.html"));

// API endpoint for saving artwork to server
app.MapPost("/api/artwork/save", async (IFormFile file) =>
{
    if (file == null || file.Length == 0)
        return Results.BadRequest("No file uploaded");

    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
    Directory.CreateDirectory(uploadsFolder);

    var fileName = $"artwork_{DateTime.Now:yyyyMMdd_HHmmss}_{file.FileName}";
    var filePath = Path.Combine(uploadsFolder, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    return Results.Ok(new { fileName, message = "Artwork saved successfully" });
});

// API endpoint for loading artwork from server
app.MapGet("/api/artwork/load/{fileName}", (string fileName) =>
{
    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);
    
    if (!File.Exists(filePath))
        return Results.NotFound("Artwork not found");

    var content = File.ReadAllText(filePath);
    return Results.Ok(content);
});

app.Run();