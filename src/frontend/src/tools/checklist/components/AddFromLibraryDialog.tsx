import React, { useState } from 'react';
import {
  DialogActions,
  Stack,
} from '@mui/material';
import { LibraryItemBrowser } from './LibraryItemBrowser';
import type { ItemLibraryEntry } from '../../../types';
import {
  CobraDialog,
  CobraPrimaryButton,
  CobraLinkButton,
} from '../../../theme/styledComponents';
import CobraStyles from '../../../theme/CobraStyles';

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
    <CobraDialog
      open={open}
      onClose={handleClose}
      title="Add Items from Library"
      contentWidth="800px"
    >
      <Stack spacing={CobraStyles.Spacing.FormFields}>
        <LibraryItemBrowser
          onSelectionChange={setSelectedItems}
          showSelectAll={true}
        />

        <DialogActions>
          <CobraLinkButton onClick={handleClose}>
            Cancel
          </CobraLinkButton>
          <CobraPrimaryButton
            onClick={handleAdd}
            disabled={selectedItems.length === 0}
          >
            Add Selected ({selectedItems.length})
          </CobraPrimaryButton>
        </DialogActions>
      </Stack>
    </CobraDialog>
  );
};
