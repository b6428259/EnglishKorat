@echo off
REM Create main folder
mkdir src

REM Create subfolders
mkdir src\routes
mkdir src\controllers
mkdir src\services
mkdir src\middleware
mkdir src\config
mkdir src\utils

REM Create files
echo // Main application entry point > src\app.js

REM Routes
echo // Main route handler > src\routes\index.js
echo // Authentication routes > src\routes\auth.js
echo // Schedulista integration routes > src\routes\schedulista.js
echo // Student management routes > src\routes\students.js
echo // Quotation management routes > src\routes\quotations.js

REM Controllers
echo // Auth Controller > src\controllers\authController.js
echo // Schedulista Controller > src\controllers\schedulistaController.js
echo // Student Controller > src\controllers\studentController.js
echo // Quotation Controller > src\controllers\quotationController.js

REM Services
echo // Auth Service > src\services\authService.js
echo // Schedulista Service > src\services\schedulistaService.js
echo // Student Service > src\services\studentService.js
echo // Quotation Service > src\services\quotationService.js

REM Middleware
echo // Auth Middleware > src\middleware\authMiddleware.js
echo // Error Middleware > src\middleware\errorMiddleware.js
echo // Upload Middleware > src\middleware\uploadMiddleware.js
echo // Validation Middleware > src\middleware\validationMiddleware.js

REM Config
echo // Database configuration > src\config\database.js

REM Utils
echo // Logger utility > src\utils\logger.js
echo // Error utilities > src\utils\errorUtils.js

echo Project structure created successfully!
pause
