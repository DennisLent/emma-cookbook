from django.test import SimpleTestCase
from users.management.commands.seed_internal_data import Command


class TagInferenceTests(SimpleTestCase):
    def setUp(self):
        self.cmd = Command()

    def test_baked_ziti_with_sausage_not_vegetarian(self):
        tags = self.cmd.infer_tags(
            title="Baked Ziti",
            description="with italian sausage and ricotta",
            ingredients=["italian sausage", "ricotta", "pasta"]
        )
        self.assertIn("Pasta", tags)
        self.assertIn("Pork", tags)
        self.assertNotIn("Vegetarian", tags)

    def test_vegetarian_dan_dan_no_chicken(self):
        tags = self.cmd.infer_tags(
            title="Dan Dan Noodle Soup (Vegetarian)",
            description="mushrooms, chili oil, soy sauce",
            ingredients=["noodles", "mushrooms", "bok choy"]
        )
        self.assertIn("Noodles", tags)
        self.assertIn("Vegetarian", tags)
        self.assertNotIn("Chicken", tags)

    def test_beef_chow_mein_has_beef_not_chicken(self):
        tags = self.cmd.infer_tags(
            title="Beef Chow Mein - great beef mince noodle recipe!",
            description="rich savory sauce",
            ingredients=["beef mince", "noodles", "soy sauce"]
        )
        self.assertIn("Beef", tags)
        self.assertIn("Noodles", tags)
        self.assertNotIn("Chicken", tags)

    def test_vegetable_broth_is_vegetarian(self):
        tags = self.cmd.infer_tags(
            title="Vegetable broth soup",
            description="hearty veg stock with noodles",
            ingredients=["vegetable broth", "noodles", "carrot"]
        )
        self.assertIn("Vegetarian", tags)
        self.assertNotIn("Chicken", tags)

    def test_chicken_broth_is_not_vegetarian(self):
        tags = self.cmd.infer_tags(
            title="Mushroom soup with chicken broth",
            description="rich chicken stock base",
            ingredients=["chicken broth", "mushrooms", "onion"]
        )
        self.assertNotIn("Vegetarian", tags)
        self.assertIn("Chicken", tags)

    def test_lard_makes_it_non_vegetarian(self):
        tags = self.cmd.infer_tags(
            title="Refried beans with lard",
            description="traditional lard-cooked beans",
            ingredients=["lard", "pinto beans", "onion"]
        )
        self.assertNotIn("Vegetarian", tags)
