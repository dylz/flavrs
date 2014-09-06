import json

class Base(object):

    def __init__(self):
        pass

    def open(self,request,action):
        self.request = request
        self.action = action
        self.data = json.loads(request.body)

        action = self.actions.get(self.action,False)
        if action:
            return action()