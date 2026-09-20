import ipaddress
import socket
import urllib.parse

import requests
from bs4 import BeautifulSoup
import re

MAX_DOWNLOAD_BYTES = 2_000_000  # never buffer more than ~2MB per scrape


def assert_public_url(url: str) -> str:
    """Reject non-http(s), unresolvable, and loopback/private/link-local targets.

    Raises ValueError on violation (callers map to 400). Prevents the scraper
    from being used as a proxy into internal networks / cloud metadata.
    """
    parsed = urllib.parse.urlparse((url or "").strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("URL must be absolute http(s)")
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except Exception:
        raise ValueError(f"Cannot resolve host in {url}")
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            continue
        if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise ValueError("Private/local targets are blocked")
    return url


def extract_text_from_url(url: str) -> str:
    try:
        assert_public_url(url)
        response = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'}, stream=True)
        response.raise_for_status()
        size = 0
        chunks: list[bytes] = []
        for chunk in response.iter_content(chunk_size=65536):
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_DOWNLOAD_BYTES:
                break
            chunks.append(chunk)
        soup = BeautifulSoup(b"".join(chunks), "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()
            
        text = soup.get_text(separator=' ')
        # Break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Limit text length to prevent exceeding token limits
        return text[:4000]
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""
