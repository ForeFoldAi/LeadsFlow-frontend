import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";

interface ColumnFilterProps {
  column: string;
  values: string[];
  selectedValues: string[];
  onFilterChange: (column: string, values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export default function ColumnFilter({
  column,
  values,
  selectedValues,
  onFilterChange,
  placeholder = "Filter",
  searchPlaceholder = "Search values..."
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedValues, setLocalSelectedValues] = useState<string[]>(selectedValues);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedValues(selectedValues);
  }, [selectedValues]);

  // Filter values based on search term
  const filteredValues = values.filter(value => 
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleValueToggle = (value: string, checked: boolean) => {
    let newSelectedValues: string[];
    
    if (checked) {
      newSelectedValues = [...localSelectedValues, value];
    } else {
      newSelectedValues = localSelectedValues.filter(v => v !== value);
    }
    
    setLocalSelectedValues(newSelectedValues);
    onFilterChange(column, newSelectedValues);
  };

  const selectAll = () => {
    const allValues = filteredValues.filter(value => !localSelectedValues.includes(value));
    const newSelectedValues = [...localSelectedValues, ...allValues];
    setLocalSelectedValues(newSelectedValues);
    onFilterChange(column, newSelectedValues);
  };

  const clearAll = () => {
    setLocalSelectedValues([]);
    onFilterChange(column, []);
  };

  const clearSelected = (value: string) => {
    const newSelectedValues = localSelectedValues.filter(v => v !== value);
    setLocalSelectedValues(newSelectedValues);
    onFilterChange(column, newSelectedValues);
  };

  const getDisplayText = () => {
    if (localSelectedValues.length === 0) return placeholder;
    if (localSelectedValues.length === 1) return localSelectedValues[0];
    return `${localSelectedValues.length} selected`;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 hover:bg-gray-100 ${
            localSelectedValues.length > 0 ? 'text-blue-600' : 'text-gray-400'
          }`}
          title={`Filter ${column}`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Filter {column}</h4>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-xs"
                disabled={filteredValues.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-700"
                disabled={localSelectedValues.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-sm"
              autoComplete="off"
            />
          </div>
          
          {/* Selected Values Badges */}
          {localSelectedValues.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {localSelectedValues.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
                >
                  {value}
                  <button
                    onClick={() => clearSelected(value)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 max-h-60 overflow-y-auto">
          {filteredValues.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              No values found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredValues.map((value) => (
                <div key={value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`${column}-${value}`}
                    checked={localSelectedValues.includes(value)}
                    onCheckedChange={(checked) => handleValueToggle(value, checked as boolean)}
                  />
                  <label
                    htmlFor={`${column}-${value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 truncate"
                    title={value}
                  >
                    {value}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 