/**
 * Item Library Content
 *
 * Embeddable content for the Item Library.
 * Used by ManagePage as a tab panel.
 *
 * Extracted from ItemLibraryPage for reuse.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  IconButton,
  Stack,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faEdit,
  faTrash,
  faCheckSquare,
  faListCheck,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { itemLibraryService } from "../services/itemLibraryService";
import { ItemLibraryItemDialog } from "../components/ItemLibraryItemDialog";
import type { ItemLibraryEntry, ItemType } from "../../../types";
import { cobraTheme } from "../../../theme/cobraTheme";
import {
  CobraTextField,
  CobraNewButton,
  CobraSecondaryButton,
  CobraDialog,
  CobraDeleteButton,
  CobraLinkButton,
} from "../../../theme/styledComponents";
import CobraStyles from "../../../theme/CobraStyles";

/**
 * Item Library Content Component
 */
export const ItemLibraryContent: React.FC = () => {
  const [items, setItems] = useState<ItemLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>("");
  const [itemType, setItemType] = useState<ItemType | "">("");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "alphabetical">(
    "recent"
  );

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemLibraryEntry | null>(
    null
  );
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemLibraryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [category, itemType, searchText, sortBy]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await itemLibraryService.getLibraryItems({
        category: category || undefined,
        itemType: itemType || undefined,
        searchText: searchText || undefined,
        sortBy,
      });
      setItems(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load library items";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      await itemLibraryService.archiveLibraryItem(itemToDelete.id);
      toast.success("Item archived successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to archive item";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = () => {
    setItemToEdit(null);
    setCreateEditDialogOpen(true);
  };

  const handleEdit = (item: ItemLibraryEntry) => {
    setItemToEdit(item);
    setCreateEditDialogOpen(true);
  };

  const handleSaved = () => {
    fetchItems();
  };

  const parseTags = (tagsJson?: string): string[] => {
    if (!tagsJson) return [];
    try {
      return JSON.parse(tagsJson);
    } catch {
      return [];
    }
  };

  const getItemTypeIcon = (type: ItemType) => {
    return type === "checkbox" ? faCheckSquare : faListCheck;
  };

  // Get unique categories from items
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <Stack spacing={3}>
      {/* Header Actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {items.length} item{items.length !== 1 ? "s" : ""} in library
        </Typography>
        <CobraNewButton onClick={handleCreate}>
          Create Library Item
        </CobraNewButton>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <CobraTextField
              fullWidth
              label="Search"
              placeholder="Search items and tags..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <FontAwesomeIcon icon={faSearch} style={{ marginRight: 8 }} />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Item Type</InputLabel>
              <Select
                value={itemType}
                label="Item Type"
                onChange={(e) => setItemType(e.target.value as ItemType | "")}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="checkbox">Checkbox</MenuItem>
                <MenuItem value="status">Status Dropdown</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <MenuItem value="recent">Most Recent</MenuItem>
                <MenuItem value="popular">Most Popular</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && <Alert severity="error">{error}</Alert>}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <Alert severity="info">
          No library items found. Try adjusting your filters or create a new
          item.
        </Alert>
      )}

      {/* Items Grid */}
      {!loading && items.length > 0 && (
        <Grid container spacing={2}>
          {items.map((item) => {
            const tags = parseTags(item.tags);

            return (
              <Grid item xs={12} md={6} lg={4} key={item.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Header */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Chip
                        icon={
                          <FontAwesomeIcon
                            icon={getItemTypeIcon(item.itemType)}
                          />
                        }
                        label={
                          item.itemType === "checkbox" ? "Checkbox" : "Status"
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {item.usageCount > 0 && (
                        <Chip
                          icon={<FontAwesomeIcon icon={faStar} />}
                          label={`Used ${item.usageCount}x`}
                          size="small"
                          sx={{
                            backgroundColor: cobraTheme.palette.success.main,
                            color: "white",
                          }}
                        />
                      )}
                    </Box>

                    {/* Item Text */}
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "bold", mb: 1 }}
                    >
                      {item.itemText}
                    </Typography>

                    {/* Category */}
                    <Chip label={item.category} size="small" sx={{ mb: 1 }} />

                    {/* Tags */}
                    {tags.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          flexWrap: "wrap",
                          mt: 1,
                        }}
                      >
                        {tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    )}

                    {/* Default Notes Preview */}
                    {item.defaultNotes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1, fontStyle: "italic" }}
                      >
                        {item.defaultNotes.length > 80
                          ? `${item.defaultNotes.substring(0, 80)}...`
                          : item.defaultNotes}
                      </Typography>
                    )}

                    {/* Metadata */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      Created by {item.createdBy} on{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
                    <CobraSecondaryButton
                      size="small"
                      startIcon={<FontAwesomeIcon icon={faEdit} />}
                      onClick={() => handleEdit(item)}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </CobraSecondaryButton>
                    <IconButton
                      color="error"
                      onClick={() => {
                        setItemToDelete(item);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create/Edit Item Dialog */}
      <ItemLibraryItemDialog
        open={createEditDialogOpen}
        onClose={() => {
          setCreateEditDialogOpen(false);
          setItemToEdit(null);
        }}
        onSaved={handleSaved}
        existingItem={itemToEdit || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <CobraDialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        title="Archive Library Item?"
        contentWidth="500px"
      >
        <Stack spacing={CobraStyles.Spacing.FormFields}>
          <Typography>
            Are you sure you want to archive "{itemToDelete?.itemText}"? You can
            restore it later if needed.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
            <CobraLinkButton
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </CobraLinkButton>
            <CobraDeleteButton onClick={handleDelete} disabled={deleting}>
              {deleting ? "Archiving..." : "Archive"}
            </CobraDeleteButton>
          </Box>
        </Stack>
      </CobraDialog>
    </Stack>
  );
};

export default ItemLibraryContent;
