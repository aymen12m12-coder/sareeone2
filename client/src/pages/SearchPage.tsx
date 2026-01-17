import { useState } from 'react';
import RestaurantCard from '../components/RestaurantCard';
import { Button } from '@/components/ui/button';
import type { Restaurant, Category, MenuItem } from '../../../shared/schema.js';

export default function SearchPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'restaurants' | 'categories' | 'menuItems'>('all');
  const [searchResults, setSearchResults] = useState<{
    restaurants: Restaurant[];
    categories: Category[];
    menuItems: MenuItem[];
  }>({ restaurants: [], categories: [], menuItems: [] });
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults({ restaurants: [], categories: [], menuItems: [] });
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('خطأ في البحث:', error);
    }
  };

  // Actually handle search from SearchBar
  const handleSearchBarInput = (type: 'restaurant' | 'category' | 'menuItem', item: any) => {
    // This is called when the search input changes, so we need to handle it differently
    if (typeof item === 'string') {
      handleSearch(item);
    }
  };

  const handleResultSelect = (type: 'restaurant' | 'category' | 'menuItem', item: any) => {
    if (type === 'restaurant') {
      window.location.href = `/restaurant/${item.id}`;
    }
  };

  const totalResults = searchResults.restaurants.length + searchResults.categories.length + searchResults.menuItems.length;

  const tabs = [
    { id: 'all', label: 'الكل', count: totalResults },
    { id: 'restaurants', label: 'المطاعم', count: searchResults.restaurants.length },
    { id: 'categories', label: 'التصنيفات', count: searchResults.categories.length },
    { id: 'menuItems', label: 'الأطباق', count: searchResults.menuItems.length },
  ];

  const filteredRestaurants = selectedTab === 'all' || selectedTab === 'restaurants' ? searchResults.restaurants : [];
  const filteredCategories = selectedTab === 'all' || selectedTab === 'categories' ? searchResults.categories : [];
  const filteredMenuItems = selectedTab === 'all' || selectedTab === 'menuItems' ? searchResults.menuItems : [];

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
        <h1 className="text-lg font-semibold text-center mb-4">البحث</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن مطاعم، أطباق أو فئات..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {hasSearched && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={selectedTab === tab.id ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSelectedTab(tab.id as any)}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>

            {/* Results */}
            {totalResults === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground">جرب البحث بكلمات مختلفة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Restaurants */}
                {filteredRestaurants.length > 0 && (
                  <div>
                    {selectedTab === 'all' && <h2 className="text-md font-semibold mb-3">المطاعم</h2>}
                    <div className="grid gap-3">
                      {filteredRestaurants.map((restaurant) => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {filteredCategories.length > 0 && (
                  <div>
                    {selectedTab === 'all' && <h2 className="text-md font-semibold mb-3">التصنيفات</h2>}
                    <div className="grid gap-2">
                      {filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => window.location.href = `/?category=${category.id}`}
                        >
                          <span className="text-2xl mr-3">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu Items */}
                {filteredMenuItems.length > 0 && (
                  <div>
                    {selectedTab === 'all' && <h2 className="text-md font-semibold mb-3">الأطباق</h2>}
                    <div className="grid gap-3">
                      {filteredMenuItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg ml-3"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <p className="text-sm font-semibold text-primary">{item.price} ر.س</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!hasSearched && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">ابحث عما تريد</h3>
            <p className="text-muted-foreground">اكتب في الصندوق أعلاه للبدء في البحث</p>
          </div>
        )}
      </div>
    </div>
  );
}