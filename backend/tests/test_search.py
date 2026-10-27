import sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import create_app
from app import routes
class SearchTests(unittest.TestCase):
 def setUp(self):
  self.client=create_app().test_client()
  self.pros=[{'id':1,'display_name':'José Muñoz','category':'Técnicos eléctricos','category_id':1,'description':'Instalación'}, {'id':2,'display_name':'Luis Díaz','category':'Plomeros','category_id':2,'description':None}]
 def find(self,q,extra):
  with patch.object(routes,'rest',return_value=self.pros),patch.object(routes,'with_categories',side_effect=lambda rows:rows):
   return self.client.get('/api/professionals',query_string={'q':q,**extra}).get_json()
 def test_name_accents_and_case(self):
  for q in ['José','Jose','JOSE','Munoz','Muñoz','Jose Munoz']:
   self.assertEqual([p['id'] for p in self.find(q,{})],[1])
 def test_occupation_accents(self):
  for q in ['tecnico','TÉCNICO','electricos','eléctricos']:
   self.assertEqual([p['id'] for p in self.find(q,{})],[1])
 def test_limit_applies_after_matching(self):self.assertEqual([p['id'] for p in self.find('Diaz',{'limit':'1'})],[2])
 def test_category_and_no_matches(self):
  self.assertEqual(self.find('Jose',{'category':'2'}),[])
  self.assertEqual(self.find('desconocido',{}),[])
if __name__=='__main__':unittest.main(verbosity=2)
