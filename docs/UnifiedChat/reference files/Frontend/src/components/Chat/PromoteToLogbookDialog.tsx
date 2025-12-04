import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { ChatMessageDto } from "../../types/chat.types";

/**
 * Category option for logbook entries.
 */
interface CategoryOption {
  id: string;
  name: string;
}

/**
 * Props for the PromoteToLogbookDialog component.
 */
interface PromoteToLogbookDialogProps {
  /** Whether the dialog is open */
  open: boolean;

  /** The chat message to promote */
  message: ChatMessageDto | null;

  /** Available logbook categories */
  categories: CategoryOption[];

  /** Whether the promotion is in progress */
  isLoading?: boolean;

  /** Error message if promotion failed */
  error?: string;

  /** Callback when dialog is closed */
  onClose: () => void;

  /** Callback when user confirms promotion */
  onConfirm: (messageId: string, categoryId?: string, notes?: string) => void;
}

/**
 * Dialog for promoting a chat message to a logbook entry.
 * Allows user to add additional notes and select a category.
 *
 * The original message content is preserved and attributed to the sender.
 * This creates an audit trail from informal chat to formal logbook record.
 */
export const PromoteToLogbookDialog: React.FC<PromoteToLogbookDialogProps> = ({
  open,
  message,
  categories,
  isLoading = false,
  error,
  onClose,
  onConfirm,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Reset form when dialog opens with new message
  React.useEffect(() => {
    if (open) {
      setSelectedCategoryId("");
      setAdditionalNotes("");
    }
  }, [open, message?.id]);

  const handleConfirm = () => {
    if (!message) return;

    onConfirm(
      message.id,
      selectedCategoryId || undefined,
      additionalNotes.trim() || undefined
    );
  };

  if (!message) return null;

  // Build the preview of what the logbook entry will look like
  const senderAttribution = message.isExternalMessage
    ? `${message.externalSenderName} (via ${message.externalSource})`
    : message.createdBy;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <i className="fa-light fa-book" style={{ color: "#0020C2" }} />
          <span>Create Logbook Entry from Chat</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Original Message Preview */}
        <Box
          sx={{
            bgcolor: "#F5F5F5",
            borderRadius: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
          >
            Original Message from {senderAttribution}
          </Typography>
          <Typography variant="body2">{message.message}</Typography>

          {message.externalAttachmentUrl && (
            <Box
              component="img"
              src={message.externalAttachmentUrl}
              alt="Attached image"
              sx={{
                maxWidth: "100%",
                maxHeight: 150,
                borderRadius: 1,
                mt: 1,
              }}
            />
          )}
        </Box>

        {/* Category Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-label">Category (Optional)</InputLabel>
          <Select
            labelId="category-label"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            label="Category (Optional)"
          >
            <MenuItem value="">
              <em>No category</em>
            </MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Additional Notes */}
        <TextField
          label="Additional Notes (Optional)"
          placeholder="Add context or additional details for the logbook entry..."
          multiline
          rows={3}
          fullWidth
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          helperText="These notes will be appended to the original message in the logbook entry."
        />

        {/* Explanation */}
        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
          <Typography variant="caption">
            This will create a new logbook entry containing the original chat
            message. The entry will be attributed to you as the creator, with
            the original sender noted in the content. This action is recorded in
            Event Actions for audit purposes.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <i className="fa-light fa-check" />
            )
          }
          sx={{
            bgcolor: "#0020C2",
            "&:hover": { bgcolor: "#0000FF" },
          }}
        >
          {isLoading ? "Creating..." : "Create Entry"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoteToLogbookDialog;
