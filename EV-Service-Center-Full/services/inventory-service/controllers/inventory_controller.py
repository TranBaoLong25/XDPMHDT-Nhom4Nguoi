from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from services.inventory_service import InventoryService
from config.config import get_db

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/")
def create_item(
    name: str = Body(...),
    part_number: str = Body(...),
    quantity: int = Body(...),
    min_quantity: int = Body(...),
    price: float = Body(...),
    db: Session = Depends(get_db)
):
    service = InventoryService(db)
    if service.get_item_by_id(part_number):
        raise HTTPException(status_code=400, detail="Item already exists")
    return service.create_item(name, part_number, quantity, min_quantity, price)

@router.get("/")
def get_all_items(db: Session = Depends(get_db)):
    return InventoryService(db).get_all_items()

@router.get("/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = InventoryService(db).get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}")
def update_item(item_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    updated = InventoryService(db).update_item(item_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    deleted = InventoryService(db).delete_item(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": item_id}

@router.get("/low-stock/")
def get_low_stock_items(db: Session = Depends(get_db)):
    return InventoryService(db).get_low_stock_items()
