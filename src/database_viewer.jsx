import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Button } from './button';
import { Input } from './input';
import { Alert, AlertDescription } from './alert';
import { Database, Search, Filter, Info, CheckCircle2, XCircle, Package, Thermometer, Droplets, Scale, Clock, Shield, Leaf } from 'lucide-react';
import { getAllProducts, getProductTypes, productToMaterialPreset } from './utils/database_loader';

export function DatabaseViewer({ onSelectProduct }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const products = getAllProducts();
  const productTypes = getProductTypes();

  // Filter products based on search and type
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.Product_Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.Product_Type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.Application_Type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || product.Product_Type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, selectedType]);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  const handleUseProduct = () => {
    if (selectedProduct && onSelectProduct) {
      const preset = productToMaterialPreset(selectedProduct);
      onSelectProduct(preset, selectedProduct);
      setShowDetails(false);
    }
  };

  const ProductCard = ({ product }) => (
    <div
      className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => handleSelectProduct(product)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-blue-600">{product.Product_Name}</h3>
        {product.CE_Marked === 'Yes' && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">CE Marked</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-2">{product.Product_Type}</p>
      <p className="text-sm text-gray-500 mb-3">{product.Application_Type}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Droplets size={14} className="text-blue-500" />
          <span>Viscosity: {product.Polyol_Viscosity_cP} cP</span>
        </div>
        {product.Overall_Applied_Density_kg_m3 && (
          <div className="flex items-center gap-1">
            <Scale size={14} className="text-purple-500" />
            <span>Density: {product.Overall_Applied_Density_kg_m3} kg/m³</span>
          </div>
        )}
        {product.Blowing_Agent && (
          <div className="flex items-center gap-1">
            <Leaf size={14} className="text-green-500" />
            <span>{product.Blowing_Agent}</span>
          </div>
        )}
        {product.Fire_Rating_EN13501 && (
          <div className="flex items-center gap-1">
            <Shield size={14} className="text-red-500" />
            <span>Fire: {product.Fire_Rating_EN13501}</span>
          </div>
        )}
      </div>
    </div>
  );

  const ProductDetails = ({ product }) => {
    if (!product) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">{product.Product_Name}</h2>
              <p className="text-gray-600">{product.Product_Type}</p>
            </div>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Application Info */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="text-blue-500" size={20} />
                Application Information
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded">
                <div>
                  <label className="text-sm font-medium text-gray-600">Application Type</label>
                  <p className="text-sm">{product.Application_Type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Blowing Agent</label>
                  <p className="text-sm">{product.Blowing_Agent}</p>
                </div>
              </div>
            </section>

            {/* Component Properties */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Droplets className="text-blue-500" size={20} />
                Component Properties
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Polyol Component</h4>
                  <p className="text-sm mb-1"><span className="font-medium">Name:</span> {product.Polyol_Component}</p>
                  <p className="text-sm mb-1"><span className="font-medium">Viscosity:</span> {product.Polyol_Viscosity_cP} cP</p>
                  <p className="text-sm mb-1"><span className="font-medium">Specific Gravity:</span> {product.Polyol_Specific_Gravity}</p>
                  <p className="text-sm"><span className="font-medium">Temperature:</span> {product.Polyol_Temp_C}°C</p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Isocyanate Component</h4>
                  <p className="text-sm mb-1"><span className="font-medium">Name:</span> {product.Isocyanate_Component}</p>
                  <p className="text-sm mb-1"><span className="font-medium">Viscosity:</span> {product.Isocyanate_Viscosity_cP} cP</p>
                  <p className="text-sm mb-1"><span className="font-medium">Specific Gravity:</span> {product.Isocyanate_Specific_Gravity}</p>
                  <p className="text-sm"><span className="font-medium">Temperature:</span> {product.Iso_Temp_C}°C</p>
                </div>
              </div>
            </section>

            {/* Mix Ratios */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Scale className="text-purple-500" size={20} />
                Mix Ratios
              </h3>
              <div className="bg-slate-50 p-4 rounded grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Weight Ratio (Polyol:Iso)</label>
                  <p className="text-lg font-semibold">{product.Mix_Ratio_Weight_Polyol}:{product.Mix_Ratio_Weight_Iso}</p>
                </div>
                {product.Mix_Ratio_Volume_Polyol && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Volume Ratio (Polyol:Iso)</label>
                    <p className="text-lg font-semibold">{product.Mix_Ratio_Volume_Polyol}:{product.Mix_Ratio_Volume_Iso}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Reaction Times */}
            {(product.Cream_Time_s_Min || product.Gel_Time_s_Min || product.Tack_Free_Time_s_Min) && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="text-green-500" size={20} />
                  Reaction Times
                </h3>
                <div className="bg-slate-50 p-4 rounded grid grid-cols-3 gap-4">
                  {product.Cream_Time_s_Min && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cream Time</label>
                      <p className="text-sm">{product.Cream_Time_s_Min}-{product.Cream_Time_s_Max} s</p>
                    </div>
                  )}
                  {product.Gel_Time_s_Min && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Gel Time</label>
                      <p className="text-sm">{product.Gel_Time_s_Min}-{product.Gel_Time_s_Max} s</p>
                    </div>
                  )}
                  {product.Tack_Free_Time_s_Min && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tack Free Time</label>
                      <p className="text-sm">{product.Tack_Free_Time_s_Min}-{product.Tack_Free_Time_s_Max} s</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Density Properties */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Scale className="text-blue-500" size={20} />
                Density Properties
              </h3>
              <div className="bg-slate-50 p-4 rounded grid grid-cols-2 gap-4">
                {product.Free_Rise_Density_kg_m3_Min && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Free Rise Density</label>
                    <p className="text-sm">{product.Free_Rise_Density_kg_m3_Min}-{product.Free_Rise_Density_kg_m3_Max} kg/m³</p>
                  </div>
                )}
                {product.Molded_Density_kg_m3_Min && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Molded Density</label>
                    <p className="text-sm">{product.Molded_Density_kg_m3_Min}-{product.Molded_Density_kg_m3_Max} kg/m³</p>
                  </div>
                )}
                {product.Overall_Applied_Density_kg_m3 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Overall Applied Density</label>
                    <p className="text-sm font-semibold">{product.Overall_Applied_Density_kg_m3} kg/m³</p>
                  </div>
                )}
              </div>
            </section>

            {/* Thermal Properties */}
            {(product.Initial_K_Factor_W_mK_Min || product.Declared_Lambda_80mm_W_mK) && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Thermometer className="text-red-500" size={20} />
                  Thermal Properties
                </h3>
                <div className="bg-slate-50 p-4 rounded grid grid-cols-2 gap-4">
                  {product.Initial_K_Factor_W_mK_Min && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Initial K-Factor</label>
                      <p className="text-sm">{product.Initial_K_Factor_W_mK_Min}-{product.Initial_K_Factor_W_mK_Max} W/(m·K)</p>
                    </div>
                  )}
                  {product.Declared_Lambda_80mm_W_mK && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Lambda @ 80mm</label>
                        <p className="text-sm">{product.Declared_Lambda_80mm_W_mK} W/(m·K)</p>
                      </div>
                      {product.Declared_Lambda_120mm_W_mK && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Lambda @ 120mm</label>
                          <p className="text-sm">{product.Declared_Lambda_120mm_W_mK} W/(m·K)</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Regulatory & Environmental */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="text-green-500" size={20} />
                Regulatory & Environmental
              </h3>
              <div className="bg-slate-50 p-4 rounded space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {product.CE_Marked === 'Yes' ? (
                      <CheckCircle2 className="text-green-500" size={16} />
                    ) : (
                      <XCircle className="text-gray-400" size={16} />
                    )}
                    <span className="text-sm">CE Marked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.PFAS_Free === 'Yes' ? (
                      <CheckCircle2 className="text-green-500" size={16} />
                    ) : (
                      <XCircle className="text-gray-400" size={16} />
                    )}
                    <span className="text-sm">PFAS Free</span>
                  </div>
                </div>
                {product.Fire_Rating_EN13501 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fire Rating (EN13501)</label>
                    <p className="text-sm font-semibold">{product.Fire_Rating_EN13501}</p>
                  </div>
                )}
                {product.DoP_Number && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">DoP Number</label>
                    <p className="text-sm">{product.DoP_Number}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Storage Requirements */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Storage Requirements</h3>
              <div className="bg-slate-50 p-4 rounded grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Polyol</h4>
                  <p className="text-sm"><span className="font-medium">Temperature:</span> {product.Polyol_Storage_Temp_C_Min}-{product.Polyol_Storage_Temp_C_Max}°C</p>
                  <p className="text-sm"><span className="font-medium">Shelf Life:</span> {product.Polyol_Shelf_Life_Months} months</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Isocyanate</h4>
                  <p className="text-sm"><span className="font-medium">Temperature:</span> {product.Iso_Storage_Temp_C_Min}-{product.Iso_Storage_Temp_C_Max}°C</p>
                  <p className="text-sm"><span className="font-medium">Shelf Life:</span> {product.Iso_Shelf_Life_Months} months</p>
                </div>
              </div>
            </section>

            {/* Notes */}
            {product.Notes && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Info className="text-blue-500" size={20} />
                  Notes
                </h3>
                <Alert>
                  <AlertDescription>{product.Notes}</AlertDescription>
                </Alert>
              </section>
            )}

            {/* Action Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Cancel
              </Button>
              <Button onClick={handleUseProduct} className="bg-blue-600 hover:bg-blue-700">
                Use This Product
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="text-blue-600" />
          Polyurethane Foam Database
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search products, types, or applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border rounded-md bg-white"
            >
              <option value="all">All Types</option>
              {productTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredProducts.length} products found</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Product List */}
        <div className="grid gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.Product_Name} product={product} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Database size={48} className="mx-auto mb-4 opacity-50" />
              <p>No products found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Product Details Modal */}
        {showDetails && <ProductDetails product={selectedProduct} />}
      </CardContent>
    </Card>
  );
}
