using Microsoft.AspNetCore.Mvc;

namespace benkuhman;

public class MainController : Controller
{
    // GET
    public IActionResult Index()
    {
        return View();
    }
}