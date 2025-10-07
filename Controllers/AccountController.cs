using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pixardi.Models;

namespace Pixardi.Controllers
{
    public class AccountController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public AccountController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }

        // GET: /Account/Register
        [HttpGet]
        [AllowAnonymous]
        public IActionResult Register()
        {
            return View();
        }

        // POST: /Account/Register
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (!ModelState.IsValid)
            {
                // Log model validation errors for troubleshooting
                foreach (var kv in ModelState)
                {
                    foreach (var err in kv.Value.Errors)
                    {
                        Console.WriteLine($"Register ModelState error: {kv.Key} => {err.ErrorMessage}");
                    }
                }
                return View(model);
            }

            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                DisplayName = model.DisplayName
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
            {
                foreach (var err in result.Errors)
                {
                    Console.WriteLine($"Register Identity error: {err.Code} => {err.Description}");
                    ModelState.AddModelError(string.Empty, err.Description);
                }
                return View(model);
            }

            // confirm the user was created and avoid null being passed to SignInAsync
            var created = await _userManager.FindByEmailAsync(model.Email);
            if (created == null)
            {
                // unexpected — surface an error so you can debug
                ModelState.AddModelError(string.Empty, "User created but could not be retrieved. Check database/connection.");
                Console.WriteLine("Register: CreateAsync returned success but FindByEmailAsync returned null.");
                return View(model);
            }

            Console.WriteLine($"User created: Id={created.Id} Email={created.Email}");
            await _signInManager.SignInAsync(created, isPersistent: false);
            return RedirectToAction("Index", "Home");
        }


        // GET: /Account/Login
        [HttpGet]
        [AllowAnonymous]
        public IActionResult Login()
        {
            return View();
        }

        // POST: /Account/Login
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model, string? returnUrl = null)
        {
            if (!ModelState.IsValid)
            {
                // dump modelstate errors to console for quick debugging
                foreach (var kv in ModelState)
                    foreach (var err in kv.Value.Errors)
                        Console.WriteLine($"ModelState error: {kv.Key} => {err.ErrorMessage}");
                return View(model);
            }

            var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, model.RememberMe, lockoutOnFailure: false);
            if (result.Succeeded)
            {
                if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl)) return Redirect(returnUrl);
                return RedirectToAction("Index", "Home");
            }

            if (result.IsLockedOut)
            {
                ModelState.AddModelError(string.Empty, "Account locked out.");
                Console.WriteLine("Login failed: account locked out.");
            }
            else if (result.IsNotAllowed)
            {
                ModelState.AddModelError(string.Empty, "Login not allowed (maybe email not confirmed).");
                Console.WriteLine("Login failed: not allowed.");
            }
            else
            {
                ModelState.AddModelError(string.Empty, "Invalid login attempt.");
                Console.WriteLine("Login failed: invalid credentials.");
            }

            return View(model);
        }

        // optional: Logout
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Index", "Home");
        }
    }
}