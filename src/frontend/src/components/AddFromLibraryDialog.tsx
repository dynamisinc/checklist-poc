import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxArchive } from '@fortawesome/free-solid-svg-icons';
import { LibraryItemBrowser } from './LibraryItemBrowser';
import type { ItemLibraryEntry } from '../types';

interface AddFromLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (items: ItemLibraryEntry[]) => void;
}

/**
 * AddFromLibraryDialog Component
 *
 * Modal dialog for browsing and selecting items from the library.
 * Allows multi-select and batch adding to templates.
 */
export const AddFromLibraryDialog: React.FC<AddFromLibraryDialogProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  const [selectedItems, setSelectedItems] = useState<ItemLibraryEntry[]>([]);

  const handleAdd = () => {
    if (selectedItems.length > 0) {
      onAdd(selectedItems);
      setSelectedItems([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faBoxArchive} />
          <Typography variant="h6" component="span">
            Add Items from Library
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <LibraryItemBrowser
          onSelectionChange={setSelectedItems}
          showSelectAll={true}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="text">
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={selectedItems.length === 0}
        >
          Add Selected ({selectedItems.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};
