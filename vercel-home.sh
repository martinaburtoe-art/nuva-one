#!/bin/sh
set -eu

python3 <<'PY'
from pathlib import Path
path = Path('src/routes/index.tsx')
text = path.read_text(encoding='utf-8')

import_marker = 'import { PublicAiChatWidget } from "@/components/public-ai-chat-widget";'
if 'home-product-preview' not in text:
    text = text.replace(import_marker, import_marker + '\nimport { HomeProductPreview } from "@/components/home-product-preview";\nimport "../home-product-preview.css";', 1)

hero_marker = '        <Hero />'
if '<HomeProductPreview />' not in text:
    text = text.replace(hero_marker, hero_marker + '\n        <HomeProductPreview />', 1)

path.write_text(text, encoding='utf-8')
PY

exec sh vercel.sh
