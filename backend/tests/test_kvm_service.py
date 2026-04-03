from app.services.kvm_service import _extract_networks


def test_extract_networks() -> None:
    config = {
        "net0": "virtio=BC:24:11:22:33:44,bridge=vmbr0,tag=10,rate=1000",
    }
    items = _extract_networks(config)
    assert len(items) == 1
    assert items[0].key == "net0"
    assert items[0].bridge == "vmbr0"
    assert items[0].tag == 10
