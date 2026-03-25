$filePath = "c:\Users\Armdd\TMS_ePOD\src\components\planning\job-dialog.tsx"
$content = Get-Content -Path $filePath -Encoding UTF8 -Raw

# Replacements
$replacements = @{
    "ลบ" = "{t('jobs.dialog.delete')}"
    "ชื่อโรงงาน/สถานที่" = "{t('jobs.dialog.location_placeholder')}"
    "ชื่อลูกค้า/สถานที่ส่ง" = "{t('jobs.dialog.location_placeholder')}"
    "ค้นหาพิกัด" = "{t('jobs.dialog.find_coords')}"
    "จุดต้นทาง" = "{t('jobs.dialog.origin')}"
    "เพิ่มจุด" = "{t('jobs.dialog.add_origin')}"
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

Set-Content -Path $filePath -Value $content -Encoding UTF8
