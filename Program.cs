var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

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

app.Run();