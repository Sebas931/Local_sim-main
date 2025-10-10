import React from 'react';
import { Card, CardContent } from './card';

/**
 * ResponsiveTable - Componente para tablas que se adaptan a móviles
 * En desktop muestra tabla normal
 * En móvil muestra cards apiladas
 */
export const ResponsiveTable = ({ headers, data, renderRow, emptyMessage = "No hay datos disponibles" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border px-3 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => renderRow(row, index))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-4">
              {renderRow(row, index, true)}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

/**
 * TableCell - Componente para celdas responsive
 */
export const TableCell = ({ label, value, className = "", mobileLabel }) => {
  return (
    <>
      {/* Desktop */}
      <td className={`hidden md:table-cell border px-3 py-2 ${className}`}>
        {value}
      </td>

      {/* Mobile */}
      {mobileLabel && (
        <div className="md:hidden flex justify-between items-center py-2 border-b last:border-b-0">
          <span className="font-medium text-gray-700 text-sm">{mobileLabel}:</span>
          <span className={`text-sm ${className}`}>{value}</span>
        </div>
      )}
    </>
  );
};

/**
 * ScrollableTable - Tabla con scroll horizontal en móviles
 */
export const ScrollableTable = ({ children, className = "" }) => {
  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;
