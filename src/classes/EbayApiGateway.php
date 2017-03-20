<?php
namespace ebay\classes;

use ebay\interfaces\EbayStatusInterface as EbayStatus;
use ebay\config\Credentials as Credentials;

/**
 * Class designed to get a USER token from eBay
 */
class EbayApiGateway implements EbayStatus {
  
  // Local copy of the PDO DB access object
  private $_objDB            = null;
  
  // Local copy of the authorization object sowe can get the user token
  private $_objAuthorization = null;
  
  // Handy for figuring out what is wrong with the curl requests - will cause 
  // the interface to fail as it spits out the curl response in verbose form to
  // the front end
  private $_bDebug = true;
  
  private $_sURL        = '';
  private $_sAPIName    = '';
  private $_sResource   = '';
  private $_sApiVersion = 'v1';
  private $_sMethod     = 'GET';
  private $_arrParams   = array();
  
  private $_arrResponse = array(
    'bOutcome'         => false,
    'nResponseCode'    => 0,
    'sResponseMessage' => 'No call to eBay REST made'
  );
  
  private $_arrMissingElements = array();
  
  public function __construct($objAuthorization) {
    $this->_objAuthorization  = $objAuthorization;
    
    if (Credentials::EBAY_PRODUCTION) {
      $this->_sURL = 'https://api.ebay.com/';
    } else {
      $this->_sURL = 'https://api.sandbox.ebay.com/';
    }
  }
  
  public function setRestMethod($sMethod) {    
    if (in_array(strtoupper($sMethod), array('GET', 'POST', 'DELETE'))) {
      $this->_sMethod = $sMethod;
    }
    return $this;
  }
  
  public function setRestApi($sApiName) {
    if (in_array($sApiName, array('inventory'))) {
      $this->_sAPIName = strtolower($sApiName);
    }
    return $this;
  }
  
  public function setRestResource($sResource) {
    $this->_sResource = $sResource;
    return $this;
  }
  
  public function setApiVersion($nVersion) {
    $this->_sApiVersion = 'v'.(int)$nVersion;
    return $this;
  }
  
  public function setParameters($arrParams) {
    $this->_arrParams = $arrParams;
    return $this;
  }
  

  /**
   * Function charged with making the CURL request to ebay, it will check that
   * certain necessities are in place before trying.
   * 
   * @return $this->_arrResponse
   */
  public function makeRestCall() {
    // Check that everything necessary to make a curl request is in place
    if ($this->isReady()) {
      $rscCurl = curl_init();
      
      // Set the URI we'll be talking to. It should be formated so:
      // https://DOMAIN/API_NAME/API_VERSION/RESOURCE/[ID]*?*PARAMS*
      $sCurlURL = $this->_sURL.$this->_sAPIName.'/'.$this->_sApiVersion.'/'.$this->_sResource.'/';
      
      // Set the authorization header
      curl_setopt($rscCurl, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer '.$this->_objAuthorization->getUserToken(),
        'Content-Type: application/json',
      ));
      
      // Set the method and any associated parameters
      if ($this->_sMethod === 'POST') {
        curl_setopt($rscCurl, CURLOPT_URL, $sCurlURL);
        curl_setopt($rscCurl, CURLOPT_POST, 1);
        curl_setopt($rscCurl, CURLOPT_POSTFIELDS, $this->_arrParams);
        
      } elseif ($this->_sMethod === 'DELETE') {
        curl_setopt($rscCurl, CURLOPT_URL, $sCurlURL);
        curl_setopt($rscCurl, CURLOPT_CUSTOMREQUEST, "DELETE");
        
      } else {
        curl_setopt($rscCurl, CURLOPT_URL, $sCurlURL.'?'.http_build_query($this->_arrParams));
      }
      
      curl_setopt($rscCurl, CURLOPT_RETURNTRANSFER, true);
      
      // Run the curl request
      $sResult = curl_exec($rscCurl);
      
      // Handle Errors
      if (curl_error($rscCurl)) {
        $this->_arrResponse['sResponseMessage'] = curl_error($rscCurl);
        
      // Otherwise we have the data we're looking for
      } else {
        $sResult = json_decode($sResult);
        $this->_arrResponse['sResponseMessage'] = $sResult;
      }
      
      // Clean up after ourselves
      curl_close($rscCurl);
      
    // If the CURL request isn't ready then send something informative
    } else {
      $this->_arrResponse['sResponseMessage'] = 'CURL not ready. Missing elements: '.print_r($this->_arrMissingElements, 1);
    }
    
    if ($this->_bDebug) {
      $this->_arrResponse['dev'] = print_r($this, 1);
    }
    
    return $this->_arrResponse;
  }
 
  /**
   * Function charged with ensuring that all the elements necessary to make a
   * curl request are in place.
   * 
   * @return boolean
   */
  private function isReady() {
    $this->_arrMissingElements = array();
    
    $bOutcome = true;
    
    if (!$this->_objAuthorization->getUserToken()) {
      $this->_arrMissingElements[] = 'usertoken';
      $bOutcome = false;
    }
    
    if (!strlen($this->_sMethod)) {
      $this->_arrMissingElements[] = 'Method missing';
      $bOutcome = false;      
    }
    
    if (!strlen($this->_sURL)) {
      $this->_arrMissingElements[] = 'URL missing';
      $bOutcome = false;      
    }

    if (!strlen($this->_sAPIName)) {
      $this->_arrMissingElements[] = 'Target API missing';
      $bOutcome = false;      
    }

    if (!strlen($this->_sApiVersion)) {
      $this->_arrMissingElements[] = 'API version missing';
      $bOutcome = false;      
    }
    
    if (!strlen($this->_sResource)) {
      $this->_arrMissingElements[] = 'Resource missing';
      $bOutcome = false;      
    }    
    
    return $bOutcome;
  }
  
  private function getMissingElements() {
    return $this->_arrMissingElements;
  }
  
}