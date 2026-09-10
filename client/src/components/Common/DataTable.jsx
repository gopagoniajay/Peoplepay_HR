import { useState, useMemo } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, ArrowUpDown, X, Inbox, 
  Filter, List, LayoutGrid, ArrowUp, ArrowDown, RotateCcw, SlidersHorizontal 
} from 'lucide-react';

// Helper to get nested value by path string e.g. "employee.firstName" or function
function resolveValue(item, path) {
  if (!item || path === null || path === undefined) return undefined;
  if (typeof path === 'function') return path(item);
  if (typeof path !== 'string') return item[path];
  if (!path.includes('.')) return item[path];
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), item);
}

export default function DataTable({
  columns = [],
  data: propData = [],
  searchKey,
  searchPlaceholder = 'Search records...',
  actions,
  pageSize: initialPageSize = 25,
  emptyMessage = 'No records found',
  filters = [], // Array of { id, label, options: [{ label, value }], getValue: fn, match: fn }
  sortOptions = [], // Optional custom sort options [{ label, field, asc }]
  kanbanConfig = null, // { groupBy: 'status', columns: [{ id, title, color, bg }], renderCard: fn }
  defaultViewMode = 'list', // 'list' | 'kanban'
  viewMode: controlledViewMode,
  onViewModeChange,
}) {
  const data = useMemo(() => {
    if (Array.isArray(propData)) return propData;
    if (Array.isArray(propData?.data)) return propData.data;
    return [];
  }, [propData]);

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalViewMode, setInternalViewMode] = useState(defaultViewMode);
  const currentViewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const handleViewModeChange = (mode) => {
    if (onViewModeChange) onViewModeChange(mode);
    setInternalViewMode(mode);
  };

  // Active filter values: { [filterId]: 'ALL' }
  const [filterValues, setFilterValues] = useState({});

  // Auto-generate sort options from sortable columns if not explicitly provided
  const availableSortOptions = useMemo(() => {
    if (sortOptions && sortOptions.length > 0) return sortOptions;
    const opts = [];
    columns.forEach((col) => {
      if (col.sortable && col.key) {
        opts.push({
          label: `${col.label || col.key}`,
          field: col.sortKey || col.key,
          key: col.key,
        });
      }
    });
    return opts;
  }, [columns, sortOptions]);

  // Sorting state
  const [sortField, setSortField] = useState(availableSortOptions[0]?.field || null);
  const [sortAsc, setSortAsc] = useState(true);

  const activeSortField = sortField;

  // Compute active filters count (excluding 'ALL')
  const activeFiltersCount = useMemo(() => {
    return Object.values(filterValues).filter(val => val && val !== 'ALL').length;
  }, [filterValues]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Text Search Filter
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        let matchesSearch = false;
        if (searchKey) {
          matchesSearch = String(resolveValue(row, searchKey) || '').toLowerCase().includes(lower);
        } else {
          matchesSearch = Object.values(row).some(val => {
            if (val === null || val === undefined) return false;
            if (typeof val === 'object') {
              return Object.values(val).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(lower));
            }
            return String(val).toLowerCase().includes(lower);
          });
        }
        if (!matchesSearch) return false;
      }

      // 2. Feature-based Filters
      for (const filter of filters) {
        const selectedVal = filterValues[filter.id] || 'ALL';
        if (selectedVal !== 'ALL') {
          const rowVal = filter.getValue ? filter.getValue(row) : resolveValue(row, filter.id || filter.key);
          if (filter.match) {
            if (!filter.match(rowVal, selectedVal, row)) return false;
          } else {
            if (rowVal === null || rowVal === undefined) return false;
            if (String(rowVal).toLowerCase() !== String(selectedVal).toLowerCase()) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [data, searchTerm, searchKey, filters, filterValues]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!activeSortField) return filteredData;
    const result = [...filteredData];
    result.sort((a, b) => {
      const aVal = resolveValue(a, activeSortField);
      const bVal = resolveValue(b, activeSortField);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }

      // Date comparison
      if (aVal instanceof Date || (typeof aVal === 'string' && (aVal.includes('-') || aVal.includes('/')) && aVal.length >= 8 && !isNaN(Date.parse(aVal)))) {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        if (!isNaN(aTime) && !isNaN(bTime)) {
          return sortAsc ? aTime - bTime : bTime - aTime;
        }
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [filteredData, activeSortField, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(key);
      setSortAsc(true);
    }
  };

  const resetAllFilters = () => {
    setFilterValues({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)' }}>
      {/* Top Toolbar: Search, Filters, Sort Selector & Action Buttons */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: '#fafbfc'
      }}>
        {/* Left Section: Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                paddingLeft: '36px',
                paddingRight: searchTerm ? '32px' : '12px',
                height: '38px',
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '0.86rem',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Center / Right Section: Sort Selector, View Mode & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Feature Sort Selector */}
          {availableSortOptions.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '9px',
              padding: '2px 6px',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '4px' }}>
                <SlidersHorizontal size={12} color="#6366f1" /> Sort:
              </span>
              <select
                value={sortField || ''}
                onChange={(e) => {
                  setSortField(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#1e293b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '4px 2px'
                }}
              >
                {availableSortOptions.map((opt, i) => (
                  <option key={i} value={opt.field}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Ascending / Descending Toggle */}
              <button
                onClick={() => setSortAsc(!sortAsc)}
                title={sortAsc ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: sortAsc ? '#eef2ff' : '#f8fafc',
                  color: sortAsc ? '#4f46e5' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              </button>
            </div>
          )}

          {/* List vs Kanban View Switcher (If kanbanConfig provided) */}
          {kanbanConfig && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              gap: '2px'
            }}>
              <button
                onClick={() => handleViewModeChange('list')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: currentViewMode === 'list' ? '#ffffff' : 'transparent',
                  color: currentViewMode === 'list' ? '#1e293b' : '#64748b',
                  boxShadow: currentViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <List size={13} /> List
              </button>
              <button
                onClick={() => handleViewModeChange('kanban')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: currentViewMode === 'kanban' ? '#ffffff' : 'transparent',
                  color: currentViewMode === 'kanban' ? '#6366f1' : '#64748b',
                  boxShadow: currentViewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
          )}

          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Feature Filter Pills Bar (Rendered when filters are supplied) */}
      {filters && filters.length > 0 && (
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Filter size={13} color="#6366f1" /> Filters:
          </div>

          {filters.map((f) => {
            const currentVal = filterValues[f.id] || 'ALL';
            const isActive = currentVal !== 'ALL';
            return (
              <div key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>{f.label}:</span>
                <select
                  value={currentVal}
                  onChange={(e) => {
                    setFilterValues(prev => ({ ...prev, [f.id]: e.target.value }));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '7px',
                    border: isActive ? '1px solid #6366f1' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#eef2ff' : '#ffffff',
                    color: isActive ? '#4338ca' : '#1e293b',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <option value="ALL">All {f.label}</option>
                  {(f.options || []).map((opt, oIdx) => (
                    <option key={oIdx} value={opt.value !== undefined ? opt.value : opt}>
                      {opt.label !== undefined ? opt.label : opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* Reset Filters Action */}
          {(activeFiltersCount > 0 || searchTerm) && (
            <button
              onClick={resetAllFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #fed7aa',
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: 'auto',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCcw size={11} /> Reset ({activeFiltersCount + (searchTerm ? 1 : 0)})
            </button>
          )}
        </div>
      )}

      {/* Main View: Kanban Board or Table List */}
      {kanbanConfig && currentViewMode === 'kanban' ? (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8fafc',
          minHeight: '440px',
          overflowX: 'auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${kanbanConfig.columns?.length || 3}, minmax(280px, 1fr))`,
            gap: '16px',
            alignItems: 'start'
          }}>
            {(kanbanConfig.columns || []).map((col) => {
              const colItems = sortedData.filter((item) => {
                const val = kanbanConfig.groupBy ? resolveValue(item, kanbanConfig.groupBy) : item.status;
                if (col.match) return col.match(val, item);
                return String(val || '').toLowerCase() === String(col.id).toLowerCase();
              });

              return (
                <div
                  key={col.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 270px)'
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: col.bg || '#f8fafc',
                    borderTopLeftRadius: '11px',
                    borderTopRightRadius: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: col.color || '#6366f1'
                      }} />
                      <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                        {col.title}
                      </span>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      color: col.color || '#6366f1',
                      border: '1px solid #e2e8f0'
                    }}>
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Cards Container */}
                  <div style={{
                    padding: '12px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1
                  }}>
                    {colItems.length === 0 ? (
                      <div style={{
                        padding: '30px 10px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        border: '1px dashed #e2e8f0',
                        borderRadius: '8px'
                      }}>
                        No items in this column
                      </div>
                    ) : (
                      colItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            padding: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                          className="kanban-card-hover"
                        >
                          {kanbanConfig.renderCard ? kanbanConfig.renderCard(item) : (
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                                {item.name || item.title || item.employeeCode || `Item #${idx + 1}`}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                {item.status || item.department?.name || '—'}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table Content */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}>
                {columns.map((col, idx) => {
                  const isSorted = (col.sortKey || col.key) === activeSortField;
                  return (
                    <th
                      key={idx}
                      onClick={() => col.sortable && handleSort(col.sortKey || col.key)}
                      style={{
                        padding: '12px 20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: isSorted ? '#4f46e5' : '#64748b',
                        letterSpacing: '0.06em',
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        backgroundColor: isSorted ? '#eef2ff' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{col.label}</span>
                        {col.sortable && (
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {isSorted ? (
                              sortAsc ? <ArrowUp size={12} color="#4f46e5" /> : <ArrowDown size={12} color="#4f46e5" />
                            ) : (
                              <ArrowUpDown size={12} color="#94a3b8" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8'
                      }}>
                        <Inbox size={22} />
                      </div>
                      <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                        {emptyMessage}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={row.id || rIdx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease'
                    }}
                    className="table-row-hover"
                  >
                    {columns.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '14px 20px',
                          fontSize: '0.875rem',
                          color: '#334155',
                          verticalAlign: 'middle'
                        }}
                      >
                        {col.render ? col.render(resolveValue(row, col.key), row) : (resolveValue(row, col.key) ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.78rem',
        color: '#64748b',
        backgroundColor: '#fafbfc',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * pageSize, sortedData.length)}</strong> of <strong style={{ color: '#0f172a' }}>{sortedData.length}</strong> entries
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>All (500)</option>
            </select>
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: currentPage === 1 ? '#94a3b8' : '#334155',
              borderRadius: '8px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ padding: '0 6px', fontWeight: 700, color: '#0f172a' }}>
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: currentPage >= totalPages ? '#94a3b8' : '#334155',
              borderRadius: '8px',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
