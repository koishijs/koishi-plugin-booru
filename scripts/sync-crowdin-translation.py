from json import dump, load
from pathlib import Path
from typing import Dict, List

def main():
    """
    Sync translations from Crowdin back to package.json files.

    This script reads the translation files from 'pkg-translations' directory
    and updates each package's `package.json` file with the translated descriptions.

    It takes the JSON files structured as `pkg-translations/<locale>.json`
    where each file contains a dictionary mapping package names to their
    translations for that locale, and merges them back into the 'description'
    field under the 'koishi' key in each package's package.json.

    e.g., `pkg-translations/en.json` : {"package-name": "English description"}
    gets merged into `packages/package-name/package.json` under koishi.description.en
    """

    root = Path(__file__).parent.parent
    packages_dir = root / "packages"
    translations_dir = root / "pkg-translations"

    if not translations_dir.exists():
        print(f"Translation directory {translations_dir} does not exist")
        return

    # Read all translation files
    all_translations: Dict[str, Dict[str, str]] = {}  # locale -> { package-name -> translation }

    for translation_file in translations_dir.glob("*.json"):
        locale = translation_file.stem
        try:
            with translation_file.open("r", encoding="utf-8") as f:
                translations = load(f)
            all_translations[locale] = translations
            print(f"Loaded {len(translations)} translations for locale '{locale}'")
        except Exception as e:
            print(f"Error loading translation file {translation_file}: {e}")
            continue

    if not all_translations:
        print("No translation files found")
        return

    # Update package.json files
    updated_packages = 0

    for package_dir in packages_dir.iterdir():
        if not package_dir.is_dir():
            continue

        pkg_json_path = package_dir / "package.json"
        if not pkg_json_path.exists():
            continue

        try:
            with pkg_json_path.open("r", encoding="utf-8") as f:
                pkg_data = load(f)
        except Exception as e:
            print(f"Error reading {pkg_json_path}: {e}")
            continue

        pkg_name = pkg_data.get("name", "")
        if not pkg_name:
            continue

        # Initialize koishi section if it doesn't exist
        if "koishi" not in pkg_data:
            pkg_data["koishi"] = {}

        if "description" not in pkg_data["koishi"]:
            pkg_data["koishi"]["description"] = {}

        # Update descriptions with translations
        updated = False
        for locale, translations in all_translations.items():
            if pkg_name in translations:
                pkg_data["koishi"]["description"][locale] = translations[pkg_name]
                updated = True

        # Write back to package.json if updated
        if updated:
            try:
                with pkg_json_path.open("w", encoding="utf-8") as f:
                    dump(pkg_data, f, ensure_ascii=False, indent=2)
                updated_packages += 1
                print(f"Updated package: {pkg_name}")
            except Exception as e:
                print(f"Error writing {pkg_json_path}: {e}")

    print(f"Successfully updated {updated_packages} packages")

if __name__ == "__main__":
    main()
