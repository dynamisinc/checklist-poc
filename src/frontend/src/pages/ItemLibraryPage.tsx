import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faCheckSquare,
  faListCheck,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { itemLibraryService } from '../services/itemLibraryService';
import type { ItemLibraryEntry, ItemType } from '../types';
import { c5Colors } from '../theme/c5Theme';

/**
 * Item Library Page
 *
 * Browse and manage reusable checklist items.
 * Users can search, filter, and add items to templates.
 */
export const ItemLibraryPage: React.FC = () => {
  const [items, setItems] = useState<ItemLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType | ''>('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alphabetical'>('recent');

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemLibraryEntry | null>(null);

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
      const message = err instanceof Error ? err.message : 'Failed to load library items';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await itemLibraryService.archiveLibraryItem(itemToDelete.id);
      toast.success('Item archived successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive item';
      toast.error(message);
    }
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
    return type === 'checkbox' ? faCheckSquare : faListCheck;
  };

  // Get unique categories from items
  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Item Library</Typography>
        <Button
          variant="contained"
          startIcon={<FontAwesomeIcon icon={faPlus} />}
          // TODO: Navigate to create item page
          onClick={() => toast.info('Create item feature coming soon')}
          sx={{ minHeight: 48 }}
        >
          Create Library Item
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search items and tags..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <FontAwesomeIcon icon={faSearch} style={{ marginRight: 8 }} />,
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
                onChange={(e) => setItemType(e.target.value as ItemType | '')}
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
                onChange={(e) => setSortBy(e.target.value as any)}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <Alert severity="info">
          No library items found. Try adjusting your filters or create a new item.
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
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        icon={<FontAwesomeIcon icon={getItemTypeIcon(item.itemType)} />}
                        label={item.itemType === 'checkbox' ? 'Checkbox' : 'Status'}
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
                            backgroundColor: c5Colors.successGreen,
                            color: 'white',
                          }}
                        />
                      )}
                    </Box>

                    {/* Item Text */}
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {item.itemText}
                    </Typography>

                    {/* Category */}
                    <Chip label={item.category} size="small" sx={{ mb: 1 }} />

                    {/* Tags */}
                    {tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                        {tags.map((tag) => (
                          <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}

                    {/* Default Notes Preview */}
                    {item.defaultNotes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}
                      >
                        {item.defaultNotes.length > 80
                          ? `${item.defaultNotes.substring(0, 80)}...`
                          : item.defaultNotes}
                      </Typography>
                    )}

                    {/* Metadata */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Created by {item.createdBy} on{' '}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FontAwesomeIcon icon={faEdit} />}
                      onClick={() => toast.info('Edit feature coming soon')}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Archive Library Item?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to archive "{itemToDelete?.itemText}"? You can restore it later if
            needed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
