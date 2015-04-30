from urlparse import urlparse

from bookmarks.models import Tab

def get_user_tabs(user):
    tabs = []
        
    for tab in Tab.objects.filter(user=user).order_by('display_order'):
        tabs.append({
            'name': tab.name,
            'id': tab.reference
        })
    
    return tabs
    
def create_link_dict(link):
    # get domain from url
    domain = '{uri.netloc}'.format(uri=urlparse(link.url))
    return {
        "id": link.reference,
        "url": link.url,
        "name": link.name,
        "img": "https://www.google.com/s2/favicons?domain=%s" % domain,
        "domain": domain
    }