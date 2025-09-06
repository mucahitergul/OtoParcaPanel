'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showPageSizeSelector?: boolean;
  showJumpToPage?: boolean;
  className?: string;
}

export default function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showPageSizeSelector = true,
  showJumpToPage = true,
  className = ''
}: PaginationProps) {
  const [jumpToPageValue, setJumpToPageValue] = useState('');

  const pageSizeOptions = [10, 20, 50, 100, 200];

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPageValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPageValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Items info and page size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <span>
            <span className="font-medium">{startItem}</span>
            {' - '}
            <span className="font-medium">{endItem}</span>
            {' / '}
            <span className="font-medium">{totalItems}</span>
            {' sonuç gösteriliyor'}
          </span>
        </div>
        
        {showPageSizeSelector && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span>Sayfa başına:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Jump to page */}
        {showJumpToPage && totalPages > 10 && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sayfaya git:</span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPageValue}
              onChange={(e) => setJumpToPageValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-16 h-8 text-center"
              placeholder="#"
            />
            <Button
              onClick={handleJumpToPage}
              disabled={!jumpToPageValue || parseInt(jumpToPageValue) < 1 || parseInt(jumpToPageValue) > totalPages}
              size="sm"
              variant="outline"
              className="h-8"
            >
              Git
            </Button>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center">
          {/* First page */}
          <Button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="İlk sayfa"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 ml-1"
            title="Önceki sayfa"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center mx-2">
            {getVisiblePages().map((page, index) => {
              if (page === '...') {
                return (
                  <div key={`dots-${index}`} className="flex items-center justify-center w-8 h-8">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </div>
                );
              }

              const pageNum = page as number;
              return (
                <Button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 mx-0.5 ${
                    pageNum === currentPage
                      ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          {/* Next page */}
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 mr-1"
            title="Sonraki sayfa"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Son sayfa"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}