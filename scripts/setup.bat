@echo off
echo Setting up IMMOMALI Backend...

REM Check if .env exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please update .env with your configuration
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Build the project
echo Building the project...
call npm run build

echo Setup complete!
echo.
echo Next steps:
echo 1. Update your .env file with the correct database credentials
echo 2. Create the database: createdb immomali
echo 3. Run migrations: npm run migration:run
echo 4. Start the development server: npm run start:dev
echo.
echo API Documentation will be available at: http://localhost:3000/api/docs

pause
