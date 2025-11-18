using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pixardi.Data;
using Pixardi.Models;
using Pixardi.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

builder.Services.AddSignalR();

// Register EF DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Identity for ApplicationUser (adds UserManager<ApplicationUser>, SignInManager<ApplicationUser>, and more)
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

// Test database connection and create initial admin
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

        // Count users 
        var userCount = context.Users.Count();
        Console.WriteLine($"Current user count: {userCount}");

        // Create initial admin user
        await CreateInitialAdmin(userManager);

    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database error: {ex.Message}");
    }
}

// the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// debugging middleware
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

app.MapHub<DrawingHub>("/drawingHub");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapRazorPages();

app.Run();

// Admin seeder method
static async Task CreateInitialAdmin(UserManager<ApplicationUser> userManager)
{
    var adminEmail = "admin"; // Change this to your desired admin email
    var adminPassword = "adminadmin"; // Change this to a secure password

    Console.WriteLine("Checking for admin user...");

    var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
    if (existingAdmin == null)
    {
        Console.WriteLine("Creating initial admin user...");
        var adminUser = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            IsAdmin = true
        };

        var result = await userManager.CreateAsync(adminUser, adminPassword);
        if (result.Succeeded)
        {
            Console.WriteLine($"✅ Admin user created successfully: {adminEmail}");
            Console.WriteLine($"🔑 Admin password: {adminPassword}");
            Console.WriteLine($"🔗 Admin panel: /Admin/Canvas");
        }
        else
        {
            Console.WriteLine($"❌ Failed to create admin user:");
            foreach (var error in result.Errors)
            {
                Console.WriteLine($"   - {error.Description}");
            }
        }
    }
    else
    {
        Console.WriteLine($"Admin user already exists: {adminEmail}");

        // Ensure existing user has admin rights
        if (!existingAdmin.IsAdmin)
        {
            existingAdmin.IsAdmin = true;
            var updateResult = await userManager.UpdateAsync(existingAdmin);
            if (updateResult.Succeeded)
            {
                Console.WriteLine($"✅ Existing user {adminEmail} promoted to admin");
            }
            else
            {
                Console.WriteLine($"❌ Failed to promote existing user to admin");
            }
        }
        else
        {
            Console.WriteLine($"✅ User {adminEmail} already has admin privileges");
        }
    }
}