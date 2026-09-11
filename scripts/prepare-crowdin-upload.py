from json import dump, load
from pathlib import Path
from typing import Dict, List

def main():
    """
    Prepare files for Crowdin upload.

    This script walks through the 'packages' directory, reads each package's
    `package.json` file, and extracts the relevant information for translation.

    Currently, it focuses on the 'description' field under the 'koishi' key,
    which should be a dictionary mapping language codes to their respective
    translations. e.g., {"en": "English description", "zh": "Chinese description"}.

    The extracted data is then saved into JSON files named `pkg-translations/<locale>.json`,
    which is structured as a dictionary where each key is the package name
    and the value is the corresponding translation.
    e.g., `pkg-translations/en.json` : {"package-name": "English description"}.
    """

    root = Path(__file__).parent.parent / "packages"
    translations: Dict[str, Dict[str, str]] = {}  # locale -> { package-name -> translation }

    # Create output directory if it doesn't exist
    (root.parent / "pkg-translations").mkdir(exist_ok=True)

    for package in root.iterdir():
        if not package.is_dir():
            continue
        pkg_json_path = package / "package.json"
        if not pkg_json_path.exists():
            continue

        with pkg_json_path.open("r", encoding="utf-8") as f:
            pkg_data = load(f)

        pkg_name: str = pkg_data.get("name", "")
        koishi_data: Dict = pkg_data.get("koishi", {})
        description_data: Dict[str, str] = koishi_data.get("description", {})

        if not isinstance(description_data, dict):
            continue

        for lang, desc in description_data.items():
            if lang not in translations:
                translations[lang] = {}
            translations[lang][pkg_name] = desc

    for locale, data in translations.items():
        output_path = root.parent / f"pkg-translations/{locale}.json"
        with output_path.open("w", encoding="utf-8") as f:
            dump(data, f, ensure_ascii=False, indent=2)

    print(f"Translation data has been written to pkg-translations/")

if __name__ == "__main__":
    main()
