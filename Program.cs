using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pixardi.Data;
using Pixardi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// Register your EF DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Identity for ApplicationUser (adds UserManager<ApplicationUser>, SignInManager<ApplicationUser>, etc.)
builder.Services.AddDefaultIdentity<ApplicationUser>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<ApplicationDbContext>();

var app = builder.Build();

// Test database connection
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    try
    {
        // Ensure database is created
        context.Database.EnsureCreated();

        // Test connection
        var canConnect = context.Database.CanConnect();
        Console.WriteLine($"Database connection test: {(canConnect ? "SUCCESS" : "FAILED")}");

        // Show database path
        var connectionString = context.Database.GetConnectionString();
        Console.WriteLine($"Connection string: {connectionString}");
        try
        {
            // Try to parse Data Source from connection string
            var parts = connectionString?.Split(';') ?? Array.Empty<string>();
            var dataSource = parts.FirstOrDefault(p => p.Trim().StartsWith("Data Source", StringComparison.OrdinalIgnoreCase));
            var dbPath = dataSource?.Split('=')[1].Trim();
            if (!string.IsNullOrWhiteSpace(dbPath))
            {
                var fullPath = Path.GetFullPath(dbPath);
                Console.WriteLine($"SQLite DB absolute path: {fullPath}");
            }
        }
        catch { }

        // Count users (should be 0 initially)
        var userCount = context.Users.Count();
        Console.WriteLine($"Current user count: {userCount}");

    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database error: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// Add debugging middleware
app.Use(async (context, next) =>
{
    Console.WriteLine($"Request: {context.Request.Method} {context.Request.Path}");
    await next();
    Console.WriteLine($"Response: {context.Response.StatusCode}");
});

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapRazorPages();

app.Run();