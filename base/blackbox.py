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
            action()
            return self._get_log()

    # HELPERS

    def _set_log(self,attrs):
        """
        attrs = dict

        Items passed in 'attrs' will be set to self.
        """

        for key,value in attrs.iteritems():
            setattr(self,key,value)

    def _get_log(self):
        """
        Return the attributes required to complete a response to the client.
        """
        #List of attributes of self that get returned to the client.
        attrs = ['status','msg','response','level']

        output = {}

        #Bind required attributes to output.
        #If attribute is not found, just return empty.
        for attr in attrs:
            output[attr] = getattr(self,attr,'')

        return output