from models.inventory import Inventory

class InventoryService:
    def __init__(self, db):
        self.db = db

    def create_item(self, name, part_number, quantity, min_quantity, price):
        new_item = Inventory(
            name=name,
            part_number=part_number,
            quantity=quantity,
            min_quantity=min_quantity,
            price=price
        )
        self.db.add(new_item)
        self.db.commit()
        self.db.refresh(new_item)
        return new_item

    def get_all_items(self):
        return self.db.query(Inventory).all()

    def get_item_by_id(self, item_id):
        return self.db.query(Inventory).filter(Inventory.id == item_id).first()

    def update_item(self, item_id, data):
        item = self.get_item_by_id(item_id)
        if not item:
            return None
        for field, value in data.items():
            setattr(item, field, value)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_item(self, item_id):
        item = self.get_item_by_id(item_id)
        if item:
            self.db.delete(item)
            self.db.commit()
        return item

    def get_low_stock_items(self):
        return self.db.query(Inventory).filter(Inventory.quantity < Inventory.min_quantity).all()
