import React, { useState, useCallback } from 'react';
import Modal from "./modal";
import './chatbot.css';

interface chatUIProps {
    modalState: boolean;
}

export const ChatUI: React.FC<chatUIProps> = ({ modalState }) => {
    const [isModalOpen, setIsModalOpen] = useState(modalState);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);
    return (
        <div>
        <Modal isOpen={isModalOpen} onClose={closeModal}>
            <input className="input-field"/>
        </Modal>
        </div>
    );
};