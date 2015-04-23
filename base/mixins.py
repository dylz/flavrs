from django.http import JsonResponse, HttpResponseBadRequest
from django.views.generic import FormView

from base.models import Profile

class CustomViewMethodsMixin(object):
    """
        A mixin that houses custom methods built for views and mixins (that are
        used in views).
    """
    
    def get_json_data(self):
        """
        Similar to `get_context_data` except the data returned here is to be
        used in response to a valid Ajax request.
        
        Data is returned as a dictionary so the JsonResponse function can
        properly convert to JSON for the front-end.
        
        By default, return the cleaned form data for the front-end to use.
        """
        
        data = getattr(self.form,'cleaned_data',None)
        
        if not data: # if no cleaned data.. return the original
            return self.form.data
        
        # if user in data, convert to it's reference
        if 'user' in data:
            data['user'] = data['user'].profile.reference
        
        # convert 'reference' to 'id'
        if 'reference' in data:
            data['id'] = data['reference']
            del data['reference']
        
        return data
    
    def json_response(self,data=None,force_error=False):
        
        # User should be authenticated
        if self.request.user.is_authenticated():
            # You can pass your own data
            if not data:
                data = self.get_json_data()
        else:
            # No user logged in - this is bad as this request should only
            # happen when a user is logged in
            data = {'syserr': 'User is not logged in'}
            
        # if 'syserr' is in data, then something went, return a 400 with the
        # error message
        if 'syserr' in data or force_error:
            status = 400
        else:
            status = 200
        return JsonResponse(data, status=status)

class AjaxResponseMixin(CustomViewMethodsMixin,FormView):
    """
    Mixin to add AJAX support to a form.
    Must be used with an object-based FormView (e.g. CreateView)
    """
    def form_invalid(self, form):
        response = super(AjaxResponseMixin, self).form_invalid(form)
        return self.json_response(form.errors,True)

    def form_valid(self, form):
        response = super(AjaxResponseMixin, self).form_valid(form)
        return self.json_response()
        
    def form_delete(self,form):
        form.instance.delete()
        return self.json_response()
            
    def post(self, request, *args, **kwargs):

        if not request.is_ajax():
            return HttpResponseBadRequest()
        
        form_class = self.get_form_class()
        form = self.get_form(form_class)
        # Turn the QueryDict to a normal dictionary
        form.data = form.data.dict()
        
        # check if 'user' is in data, and if it is, replace it with a user
        # object..
        # fyi, user is a random set of chars (ex. dkw9fjsd) so the front-end
        # does not know anything about database ids
        user = form.data.get('user')
        if user:
            try:
                profile = Profile.objects.get(reference=user)
            except Profile.DoesNotExist:
                pass
            else:
                form.data['user'] = profile.user_id
            
                pra = getattr(self,'post_requires_authentication',False)
                if pra and profile.reference != user:
                    # bad request
                    return HttpResponseBadRequest()
        
        # check if add or edit
        reference = self.kwargs.get('reference')
        id = form.data.get('id')
        if reference and reference == id:
            # edit
            model = self.form_class.Meta.model
            try:
                form.instance = model.objects.get(reference=reference)
            except model.DoesNotExist:
                pass
                    
        elif reference:
            # big problem
            return HttpResponseBadRequest()
        
        if id:
            # add..
            form.data['reference'] = id
        
        self.form = form
        if self.remove:
            return self.form_delete(form)
        elif form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)