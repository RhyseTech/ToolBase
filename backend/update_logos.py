import urllib.parse
from app.database import SessionLocal
from app.models.domain import Tool

db = SessionLocal()
tools = db.query(Tool).all()
for tool in tools:
    if not tool.logo_url:
        try:
            parsed_uri = urllib.parse.urlparse(tool.url)
            domain = '{uri.netloc}'.format(uri=parsed_uri)
            if domain.startswith("www."):
                domain = domain[4:]
            tool.logo_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
        except Exception as e:
            print(f"Error for {tool.url}: {e}")
db.commit()
db.close()
print("Updated all tools.")
