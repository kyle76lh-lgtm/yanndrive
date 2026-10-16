"""Build a small French AI headlines feed, without external dependencies."""
import json
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

OUTPUT = Path(__file__).resolve().parent.parent / 'data' / 'ai-news.json'
FEED = 'https://news.google.com/rss/search?q=intelligence+artificielle+when:7d&hl=fr&gl=FR&ceid=FR:fr'

def parse_feed(xml, now):
    articles, seen = [], set()
    for item in ET.fromstring(xml).findall('./channel/item'):
        title = (item.findtext('title') or '').strip()
        url = (item.findtext('link') or '').strip()
        source = (item.findtext('source') or 'Presse').strip()
        try:
            published = parsedate_to_datetime(item.findtext('pubDate') or '').astimezone(timezone.utc)
        except (ValueError, TypeError, OverflowError):
            continue
        if not title or urlparse(url).scheme != 'https' or url in seen or not now - timedelta(days=7) <= published <= now + timedelta(minutes=10):
            continue
        seen.add(url)
        suffix = ' - ' + source
        if title.endswith(suffix):
            title = title[:-len(suffix)]
        articles.append(dict(title=title, url=url, source=source, publishedAt=published.isoformat()))
    return sorted(articles, key=lambda article: article['publishedAt'], reverse=True)[:12]

def main():
    now = datetime.now(timezone.utc)
    try:
        previous = json.loads(OUTPUT.read_text(encoding='utf-8'))
        if now - datetime.fromisoformat(previous['updatedAt']) < timedelta(hours=1):
            print('NEWS IA : cache de moins d’une heure conservé')
            return
    except (OSError, ValueError, KeyError, TypeError):
        pass
    try:
        with urlopen(Request(FEED, headers={'User-Agent': 'LHdrive news reader'}), timeout=25) as response:
            articles = parse_feed(response.read(), now)
        if not articles:
            raise ValueError('aucun article récent valide')
    except Exception as error:
        print(f'NEWS IA : flux indisponible, dernière sélection conservée ({error})')
        return
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(dict(updatedAt=now.isoformat(), source='Google Actualités · presse francophone', articles=articles), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'NEWS IA : {len(articles)} titres enregistrés')

if __name__ == '__main__':
    main()
