using Microsoft.AspNetCore.Mvc;

namespace Pixardi.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            // Add some debugging
            Console.WriteLine("HomeController.Index() called");
            ViewData["Title"] = "Pixardi - Pixel Art Editor";
            return View();
        }

        public IActionResult Test()
        {
            Console.WriteLine("HomeController.Test() called");
            return View();
        }

        public IActionResult SelfContained()
        {
            Console.WriteLine("HomeController.SelfContained() called");
            return View();
        }
    }
}