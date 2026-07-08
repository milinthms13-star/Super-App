import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

const LanguageSwitcher = ({ currentLanguage, onLanguageChange, compact = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  ];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (langCode) => {
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
    handleClose();
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  if (compact) {
    return (
      <>
        <Tooltip title="Change Language">
          <IconButton
            onClick={handleClick}
            size="small"
            aria-controls={open ? 'language-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <LanguageIcon />
          </IconButton>
        </Tooltip>
        <Menu
          id="language-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'language-button',
          }}
        >
          {languages.map((lang) => (
            <MenuItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              selected={lang.code === currentLanguage}
            >
              <ListItemIcon>
                {lang.code === currentLanguage ? <CheckIcon /> : <span>{lang.flag}</span>}
              </ListItemIcon>
              <ListItemText>
                {lang.nativeName}
              </ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<LanguageIcon />}
        onClick={handleClick}
        aria-controls={open ? 'language-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        {currentLang.flag} {currentLang.nativeName}
      </Button>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            selected={lang.code === currentLanguage}
          >
            <ListItemIcon>
              {lang.code === currentLanguage ? <CheckIcon fontSize="small" /> : <span>{lang.flag}</span>}
            </ListItemIcon>
            <ListItemText
              primary={lang.nativeName}
              secondary={lang.name}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
