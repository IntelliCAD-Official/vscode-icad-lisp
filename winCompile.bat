del out /S /Q /F

call npm run compile

echo copying icadProcessFinder.exe...
copy utils\icadProcessFinder\bin\icadProcessFinder.exe out\process
echo copying webHelpAbstraction.json...
copy extension\src\help\webHelpAbstraction.json out\help
