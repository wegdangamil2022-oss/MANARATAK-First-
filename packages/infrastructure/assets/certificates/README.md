# Certificate assets

Noto Sans Arabic Regular and Bold are bundled under the SIL Open Font License (see OFL.txt). Source: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSansArabic

DejaVu Serif Regular and Bold are bundled for the English certificate text; see DejaVu-LICENSE.txt. Source: https://dejavu-fonts.github.io/

manaratak-logo-official.png is the same official bitmap as apps/web/public/brand/manaratak-logo-official.png. The approved template clips the emblem and bilingual wordmarks without redrawing them; the educational-opportunities slogan is outside the visible clips.

Keep this assets directory beside the infrastructure dist directory in deployment. The approved renderer embeds the fonts in editable SVG and outlines shaped glyphs in PDF so Arabic remains correct. No system font or browser installation is required. Administration preview uses the matching copies in apps/admin/public/fonts.
