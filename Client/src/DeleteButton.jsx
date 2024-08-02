import React from 'react';

const DeleteButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '0px',
        right: '0px',
        background: 'red',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        zIndex: 2,
      }}
    >
      X
    </button>
  );
};

export default DeleteButton;
