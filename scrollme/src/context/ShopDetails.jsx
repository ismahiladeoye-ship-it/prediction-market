import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getShopDetailsAPI } from '../services/site/siteService';
import { storeConfig } from '../data';

// Who runs the shop, from Admin → Shop details (footer, legal pages, contact
// page). Until loaded, or if the API is unreachable, the storeConfig values.
const STARTER = {
  name: storeConfig.name,
  legalName: '',
  address: '',
  email: storeConfig.contactEmail || '',
  phone: '',
  companyNumber: '',
  vatNumber: '',
  deliveryEstimate: '3–5 working days',
  returnPostage: 'customer',
  socials: { ...storeConfig.socials },
  delivery: null,
  configured: false,
  loaded: false,
};

const ShopDetailsContext = createContext({ ...STARTER, reload: () => {} });

export const ShopDetailsProvider = ({ children }) => {
  const [details, setDetails] = useState(STARTER);
  const reload = useCallback(
    () =>
      getShopDetailsAPI()
        .then((d) => setDetails({ ...STARTER, ...d, socials: { ...STARTER.socials, ...d.socials }, loaded: true }))
        .catch(() => setDetails((s) => ({ ...s, loaded: true }))),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  const value = useMemo(() => ({ ...details, reload }), [details, reload]);
  return <ShopDetailsContext.Provider value={value}>{children}</ShopDetailsContext.Provider>;
};

export const useShopDetails = () => useContext(ShopDetailsContext);
