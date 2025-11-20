import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Checkbox,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckSquare, faListCheck, faStar } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { itemLibraryService } from '../services/itemLibraryService';
import type { ItemLibraryEntry, ItemType } from '../types';
import { c5Colors } from '../theme/c5Theme';

interface LibraryItemBrowserProps {
  /** Callback when selection changes */
  onSelectionChange: (selectedItems: ItemLibraryEntry[]) => void;
  /** Currently selected item IDs */
  selectedIds?: Set<string>;
  /** Show select all checkbox */
  showSelectAll?: boolean;
}

/**
 * LibraryItemBrowser Component
 *
 * Reusable component for browsing and selecting items from the library.
 * Can be used in dialogs, sidebars, or inline.
 */
export const LibraryItemBrowser: React.FC<LibraryItemBrowserProps> = ({
  onSelectionChange,
  selectedIds = new Set(),
  showSelectAll = true,
}) => {
  const [items, setItems] = useState<ItemLibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>('');
  const [itemType, setItemType] = useState<ItemType | ''>('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alphabetical'>('popular');

  // Local selection state
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(selectedIds);

  useEffect(() => {
    fetchItems();
  }, [category, itemType, searchText, sortBy]);

  useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

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

  const handleToggleItem = (item: ItemLibraryEntry) => {
    const newSelected = new Set(localSelectedIds);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }
    setLocalSelectedIds(newSelected);

    // Return selected items
    const selectedItems = items.filter(i => newSelected.has(i.id));
    onSelectionChange(selectedItems);
  };

  const handleSelectAll = () => {
    if (localSelectedIds.size === items.length) {
      // Deselect all
      setLocalSelectedIds(new Set());
      onSelectionChange([]);
    } else {
      // Select all
      const allIds = new Set(items.map(i => i.id));
      setLocalSelectedIds(allIds);
      onSelectionChange(items);
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

  const isAllSelected = items.length > 0 && localSelectedIds.size === items.length;
  const isSomeSelected = localSelectedIds.size > 0 && localSelectedIds.size < items.length;

  return (
    <Box>
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search"
            placeholder="Search items and tags..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <FontAwesomeIcon icon={faSearch} style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={itemType}
              label="Type"
              onChange={(e) => setItemType(e.target.value as ItemType | '')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="checkbox">Checkbox</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortBy}
              label="Sort"
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <MenuItem value="popular">Popular</MenuItem>
              <MenuItem value="recent">Recent</MenuItem>
              <MenuItem value="alphabetical">A-Z</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Select All */}
      {showSelectAll && items.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onChange={handleSelectAll}
            />
            <Typography variant="body2">
              Select All ({items.length} items)
            </Typography>
          </Box>
          {localSelectedIds.size > 0 && (
            <Chip
              label={`${localSelectedIds.size} selected`}
              color="primary"
              size="small"
            />
          )}
        </Box>
      )}

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
          No library items found. Try adjusting your filters.
        </Alert>
      )}

      {/* Items List */}
      {!loading && items.length > 0 && (
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {items.map((item) => {
            const tags = parseTags(item.tags);
            const isSelected = localSelectedIds.has(item.id);

            return (
              <Card
                key={item.id}
                sx={{
                  mb: 1,
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${c5Colors.cobaltBlue}` : '1px solid #e0e0e0',
                  backgroundColor: isSelected ? c5Colors.whiteBlue : 'white',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
                onClick={() => handleToggleItem(item)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggleItem(item)}
                    />

                    {/* Content */}
                    <Box sx={{ flexGrow: 1 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            icon={<FontAwesomeIcon icon={getItemTypeIcon(item.itemType)} />}
                            label={item.itemType === 'checkbox' ? 'Checkbox' : 'Status'}
                            size="small"
                            variant="outlined"
                          />
                          <Chip label={item.category} size="small" />
                        </Box>
                        {item.usageCount > 0 && (
                          <Chip
                            icon={<FontAwesomeIcon icon={faStar} />}
                            label={`${item.usageCount}x`}
                            size="small"
                            sx={{
                              backgroundColor: c5Colors.successGreen,
                              color: 'white',
                            }}
                          />
                        )}
                      </Box>

                      {/* Item Text */}
                      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {item.itemText}
                      </Typography>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
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
                          sx={{ display: 'block', fontStyle: 'italic' }}
                        >
                          {item.defaultNotes.length > 60
                            ? `${item.defaultNotes.substring(0, 60)}...`
                            : item.defaultNotes}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
