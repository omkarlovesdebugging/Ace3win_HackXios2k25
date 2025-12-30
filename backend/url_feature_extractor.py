"""
Web URL Security Analysis Module
Extracts security-relevant features from URLs and web content for ML classification
"""

import re
import socket
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from tld import get_tld

class WebSecurityAnalyzer:
    def __init__(self, target_url, request_timeout=10):
        self.target_url = target_url
        self.request_timeout = request_timeout
        self.url_components = self._parse_url_safely(target_url)
        self.hostname = self.url_components.netloc if self.url_components else ''
        self.html_parser = None
        self.raw_content = None
        self.http_response = None
        self.fetch_error = None

        try:
            request_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            self.http_response = requests.get(target_url, headers=request_headers, timeout=self.request_timeout)
            self.raw_content = self.http_response.text
            self.html_parser = BeautifulSoup(self.raw_content, 'html.parser')
        except Exception as error:
            self.fetch_error = str(error)

    def _parse_url_safely(self, url_string):
        try:
            return urlparse(url_string)
        except:
            return None

    def calculate_url_length(self):
        return len(self.target_url) if self.target_url else 0

    def calculate_hostname_length(self):
        return len(self.hostname) if self.hostname else 0

    def calculate_tld_length(self):
        try:
            top_level_domain = get_tld(self.target_url, fail_silently=True)
            return len(top_level_domain) if top_level_domain else 0
        except:
            return 0

    def calculate_letter_ratio(self):
        alphabetic_chars = sum(char.isalpha() for char in self.target_url)
        return alphabetic_chars / len(self.target_url) if self.target_url else 0

    def calculate_digit_ratio(self):
        numeric_chars = sum(char.isdigit() for char in self.target_url)
        return numeric_chars / len(self.target_url) if self.target_url else 0

    def count_image_elements(self):
        return len(self.html_parser.find_all('img')) if self.html_parser else 0

    def count_script_elements(self):
        return len(self.html_parser.find_all('script')) if self.html_parser else 0

    def count_stylesheet_links(self):
        return len(self.html_parser.find_all('link', {'rel': 'stylesheet'})) if self.html_parser else 0

    def count_internal_references(self):
        if not self.html_parser or not self.url_components:
            return 0
        site_base_url = f"{self.url_components.scheme}://{self.url_components.netloc}"
        internal_ref_count = 0
        for element in self.html_parser.find_all(['a', 'link', 'script', 'img']):
            resource_url = element.get('href') or element.get('src')
            if resource_url:
                absolute_url = urljoin(site_base_url, resource_url)
                if absolute_url.startswith(site_base_url):
                    internal_ref_count += 1
        return internal_ref_count

    def count_external_references(self):
        if not self.html_parser or not self.url_components:
            return 0
        site_base_url = f"{self.url_components.scheme}://{self.url_components.netloc}"
        external_ref_count = 0
        for element in self.html_parser.find_all(['a', 'link', 'script', 'img']):
            resource_url = element.get('href') or element.get('src')
            if resource_url:
                absolute_url = urljoin(site_base_url, resource_url)
                if not absolute_url.startswith(site_base_url) and urlparse(absolute_url).netloc:
                    external_ref_count += 1
        return external_ref_count

    def uses_secure_protocol(self):
        return 1 if self.url_components and self.url_components.scheme == 'https' else 0

    def contains_obfuscated_code(self):
        if not self.raw_content:
            return 0
        suspicious_patterns = [
            r'%[0-9a-fA-F]{2}', r'\\x[0-9a-fA-F]{2}', r'&#x[0-9a-fA-F]+;',
            r'javascript:', r'eval\(', r'document\.write', r'fromCharCode'
        ]
        return 1 if any(re.search(pattern, self.raw_content) for pattern in suspicious_patterns) else 0

    def contains_page_title(self):
        return 1 if self.html_parser and self.html_parser.title and self.html_parser.title.string.strip() else 0

    def contains_meta_description(self):
        meta_tag = self.html_parser.find('meta', attrs={'name': 'description'}) if self.html_parser else None
        return 1 if meta_tag and meta_tag.get('content', '').strip() else 0

    def contains_form_submission(self):
        if not self.html_parser:
            return 0
        return 1 if self.html_parser.find('input', {'type': 'submit'}) or self.html_parser.find('button') else 0

    def references_social_networks(self):
        if not self.html_parser:
            return 0
        return 1 if re.search(r'facebook|twitter|linkedin|instagram|youtube|pinterest', self.html_parser.decode(), re.I) else 0

    def contains_favicon_link(self):
        return 1 if self.html_parser and self.html_parser.find('link', rel=re.compile('icon', re.I)) else 0

    def contains_copyright_notice(self):
        if not self.html_parser:
            return 0
        return 1 if re.search(r'copyright|©', self.html_parser.get_text(), re.I) else 0

    def contains_popup_windows(self):
        return 1 if self.raw_content and re.search(r'window\.open\s*\(', self.raw_content) else 0

    def contains_iframe_elements(self):
        return 1 if self.html_parser and self.html_parser.find('iframe') else 0

    def has_suspicious_url_patterns(self):
        if not self.target_url:
            return 0
        suspicious_indicators = [r'@', r'//\w+@', r'\d+\.\d+\.\d+\.\d+', r'\.(exe|zip|rar|dll|js)$']
        return 1 if any(re.search(pattern, self.target_url) for pattern in suspicious_indicators) else 0

    def analyze_redirect_behavior(self):
        if not self.http_response:
            return 0
        return 1 if len(self.http_response.history) > 0 else -1
    def generate_feature_vector(self):
        """Generate complete feature vector for ML model prediction"""
        if self.fetch_error:
            return {"error": self.fetch_error}

        redirect_status = self.analyze_redirect_behavior()

        # Convert redirect status to binary features
        if redirect_status == -1:
            redirect_none, redirect_exists = 0, 0
        elif redirect_status == 0:
            redirect_none, redirect_exists = 1, 0
        elif redirect_status == 1:
            redirect_none, redirect_exists = 0, 1

        # Calculate letter-to-digit ratio with epsilon for numerical stability
        letter_ratio = self.calculate_letter_ratio()
        digit_ratio = self.calculate_digit_ratio()
        ratio_metric = letter_ratio / (digit_ratio + 1e-5)

        return {
            'URLLength': self.calculate_url_length(),
            'DomainLength': self.calculate_hostname_length(),
            'TLDLength': self.calculate_tld_length(),
            'NoOfImage': self.count_image_elements(),
            'NoOfJS': self.count_script_elements(),
            'NoOfCSS': self.count_stylesheet_links(),
            'NoOfSelfRef': self.count_internal_references(),
            'NoOfExternalRef': self.count_external_references(),
            'IsHTTPS': self.uses_secure_protocol(),
            'HasObfuscation': self.contains_obfuscated_code(),
            'HasTitle': self.contains_page_title(),
            'HasDescription': self.contains_meta_description(),
            'HasSubmitButton': self.contains_form_submission(),
            'HasSocialNet': self.references_social_networks(),
            'HasFavicon': self.contains_favicon_link(),
            'HasCopyrightInfo': self.contains_copyright_notice(),
            'popUpWindow': self.contains_popup_windows(),
            'Iframe': self.contains_iframe_elements(),
            'Abnormal_URL': self.has_suspicious_url_patterns(),
            'LetterToDigitRatio': ratio_metric,
            'Redirect_0': redirect_none,
            'Redirect_1': redirect_exists
        }