using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Pixardi.Models;

namespace Pixardi.Controllers
{
    public class HomeController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public HomeController(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                var user = await _userManager.GetUserAsync(User);
                if (user != null)
                {
                    // Use DisplayName if available, otherwise fall back to email
                    ViewData["UserDisplayName"] = !string.IsNullOrEmpty(user.DisplayName)
                        ? user.DisplayName
                        : user.Email?.Split('@')[0]; // Use part before @ if no display name
                }
            }

            return View();
        }
    }
}