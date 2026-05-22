import Modal from "@/components/Shared/Modal";
import EntityForm from "@/components/EntityForm";
import { Entity } from "@/types/entity";

interface EntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (entity: Entity) => void;
    entity?: Entity | null;
}

export default function EntityModal({ isOpen, onClose, onSuccess, entity }: EntityModalProps) {
    const isEditing = !!entity;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Edit Entity" : "Track New Entity"}
            description={isEditing
                ? "Update the details of your tracked entity below."
                : "Define the entity you want to track visibility for in LLMs."
            }
        >
            <EntityForm
                initialData={entity ?? null}
                isEditing={isEditing}
                onSuccess={(result) => {
                    onSuccess(result);
                    onClose();
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}
