"""Build the 256-name Fa catalogue from the supplied reference PDF.

The PDF labels 246 entries. Ten combinations are absent from its numbered
headings; they are inserted in their expected positions in the 16 x 16 matrix.
Only names are exported. Detailed teachings stay in the verified corpus.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "references" / "Les 256 signe .pdf"
OUTPUT_PATH = ROOT / "src" / "data" / "fa-sign-names.json"

MOTHER_NAMES = [
    "Gbé-Mèdji",
    "Yèkou-Mèdji",
    "Woli-Mèdji",
    "Di-Mèdji",
    "Losso-Mèdji",
    "Winlin-Mèdji",
    "Abla-Mèdji",
    "Aklan-Mèdji",
    "Guda-Mèdji",
    "Sa-Mèdji",
    "Trukpin-Mèdji",
    "Tula-Mèdji",
    "Lètè-Mèdji",
    "Tchè-Mèdji",
    "Ka-Mèdji",
    "Fu-Mèdji",
]

# The source jumps over these combinations while numbering its headings.
MISSING_BY_ROW = {
    "WINLIN": [(11, "WINLIN TULA"), (14, "WINLIN KA")],
    "SA": [(6, "SA ABLA")],
    "LETE": [(1, "LETE YEKOU")],
    "FU": [
        (9, "FU SA"),
        (10, "FU TRUKPIN"),
        (11, "FU TULA"),
        (12, "FU LETE"),
        (13, "FU TCHE"),
        (14, "FU KA"),
    ],
}

ROW_RANGES = [
    ("GBE", 17, 31),
    ("YEKU", 32, 46),
    ("WOLI", 47, 61),
    ("DI", 62, 76),
    ("LOSSO", 77, 91),
    ("WINLIN", 92, 104),
    ("ABLA", 105, 119),
    ("AKLAN", 120, 134),
    ("GOUDA", 135, 149),
    ("SA", 150, 163),
    ("TRUKPIN", 164, 178),
    ("TOULA", 179, 193),
    ("LETE", 194, 207),
    ("KA", 208, 222),
    ("TCHE", 223, 237),
    ("FU", 238, 246),
]


def clean_name(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    value = re.sub(r"\s*[–—-]\s*", "-", value)
    return value


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value


def extract_numbered_names() -> dict[int, str]:
    reader = PdfReader(PDF_PATH)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    matches = re.findall(r"(?m)^\s*(\d{1,3})\s*[-–]\s*(.+?)\s*$", text)
    names = {int(number): clean_name(name) for number, name in matches}
    expected = set(range(1, 247))
    if set(names) != expected:
        missing = sorted(expected - set(names))
        extra = sorted(set(names) - expected)
        raise RuntimeError(f"Unexpected PDF numbering; missing={missing}, extra={extra}")
    return names


def build_catalog() -> dict[str, object]:
    source_names = extract_numbered_names()
    entries: list[dict[str, object]] = []

    for index, name in enumerate(MOTHER_NAMES, start=1):
        entries.append(
            {
                "slug": slugify(name),
                "nom": name,
                "numero": index,
                "type": "signe_mere",
                "documentSlug": slugify(name),
                "source": "corpus-detaille",
            }
        )

    next_number = 17
    for row, start, end in ROW_RANGES:
        row_names = [source_names[number] for number in range(start, end + 1)]
        for position, missing_name in MISSING_BY_ROW.get(row, []):
            row_names.insert(position, missing_name)
        if len(row_names) != 15:
            raise RuntimeError(f"Row {row} contains {len(row_names)} names instead of 15")
        for name in row_names:
            sign_slug = f"signe-{next_number:03d}-{slugify(name)}"
            entries.append(
                {
                    "slug": sign_slug,
                    "nom": name,
                    "numero": next_number,
                    "type": "autre",
                    "documentSlug": sign_slug,
                    "source": "pdf" if name in source_names.values() else "matrice-completee",
                }
            )
            next_number += 1

    if len(entries) != 256 or len({entry["slug"] for entry in entries}) != 256:
        raise RuntimeError("The generated catalogue must contain 256 unique entries")

    return {
        "source": {
            "titre": "256 SIGNES DU FÂ",
            "fichier": PDF_PATH.name,
            "auteur": "ESMAC-HWENDO",
            "entreesNumeroteesDansLePdf": 246,
            "combinaisonsCompletees": [
                name for values in MISSING_BY_ROW.values() for _, name in values
            ],
        },
        "capacite": 256,
        "signes": entries,
    }


OUTPUT_PATH.write_text(
    json.dumps(build_catalog(), ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Wrote {OUTPUT_PATH} with 256 sign names")
