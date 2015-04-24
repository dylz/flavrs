from bookmarks.models import Tab

def get_user_tabs(user):
    tabs = []
        
    for tab in Tab.objects.filter(user=user).order_by('display_order'):
        tabs.append({
            'name': tab.name,
            'id': tab.reference
        })
    
    return tabs