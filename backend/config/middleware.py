class TrailingSlashMiddleware:
    """Ensure all API request paths end with a trailing slash.

    Next.js rewrites may strip the trailing slash when proxying to Django.
    This middleware normalises the path before Django's URL resolver runs,
    avoiding APPEND_SLASH redirect errors on POST requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.endswith('/'):
            request.path += '/'
            request.path_info += '/'
        return self.get_response(request)
