import base64
import binascii
import io
import re
from pathlib import Path

from common.exceptions import AIGenerationError

MAX_DOCUMENT_BYTES = 30 * 1024 * 1024
MAX_CONTEXT_CHARACTERS = 30_000
CHUNK_CHARACTERS = 6_000


def extract_documents(documents: list[dict]) -> list[dict[str, str]]:
    extracted = []
    for document in documents:
        name = document["name"]
        encoding = document.get("encoding")
        content = document["content"]
        if encoding != "base64":
            extracted.append({"name": name, "content": content})
            continue

        try:
            raw = base64.b64decode(content, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise AIGenerationError(f"Le fichier {name} est invalide.") from exc
        if len(raw) > MAX_DOCUMENT_BYTES:
            raise AIGenerationError(f"Le fichier {name} dépasse la taille maximale de 30 Mo.")

        suffix = Path(name).suffix.lower()
        if suffix == ".pdf":
            text = _extract_pdf(raw, name)
        elif suffix == ".docx":
            text = _extract_docx(raw, name)
        else:
            raise AIGenerationError(f"Le format {suffix or 'de ce fichier'} n'est pas pris en charge.")
        extracted.append({"name": name, "content": text})
    return extracted


def select_relevant_documents(documents: list[dict[str, str]], query: str) -> list[dict[str, str]]:
    """Réduit le contexte envoyé au modèle aux passages les plus liés à la question."""
    query_words = _keywords(query)
    selected: list[tuple[int, int, str, str]] = []
    total_characters = 0

    for document in documents:
        content = document["content"]
        chunks = [content[index : index + CHUNK_CHARACTERS] for index in range(0, len(content), CHUNK_CHARACTERS)]
        for index, chunk in enumerate(chunks):
            score = sum(chunk.lower().count(word) for word in query_words)
            selected.append((score, index, document["name"], chunk))

    selected.sort(key=lambda item: (-item[0], item[2], item[1]))
    context: dict[str, list[tuple[int, str]]] = {}
    for _, index, name, chunk in selected:
        if total_characters + len(chunk) > MAX_CONTEXT_CHARACTERS:
            continue
        context.setdefault(name, []).append((index, chunk))
        total_characters += len(chunk)
        if total_characters >= MAX_CONTEXT_CHARACTERS:
            break

    return [
        {"name": name, "content": "\n".join(chunk for _, chunk in sorted(chunks))[:MAX_CONTEXT_CHARACTERS]}
        for name, chunks in context.items()
    ]


def _keywords(text: str) -> list[str]:
    words = re.findall(r"[a-zA-ZÀ-ÿ]{4,}", text.lower())
    return list(dict.fromkeys(words)) or ["document"]


def _extract_pdf(raw: bytes, name: str) -> str:
    try:
        from pypdf import PdfReader

        text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(raw)).pages).strip()
    except Exception as exc:
        raise AIGenerationError(f"Impossible de lire le PDF {name}.") from exc
    if not text:
        raise AIGenerationError(f"Le PDF {name} ne contient pas de texte extractible.")
    return text


def _extract_docx(raw: bytes, name: str) -> str:
    try:
        from docx import Document

        document = Document(io.BytesIO(raw))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    except Exception as exc:
        raise AIGenerationError(f"Impossible de lire le fichier Word {name}.") from exc
    if not text:
        raise AIGenerationError(f"Le fichier Word {name} ne contient pas de texte extractible.")
    return text
